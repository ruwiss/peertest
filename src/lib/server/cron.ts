import { and, eq, inArray } from 'drizzle-orm';
import { db } from './db';
import { apps, checkpoints, commitments, users } from './db/schema';
import { getSetting } from './config';
import { applyScore } from './score';
import { freezeUserApps, unfreezeIfClear } from './commitment';
import { sendTemplate } from './notify';
import { countdownText } from '$lib/utils/date';
import type { TemplateKey } from './templates';

export interface CronResult {
	reminders: number;
	missed: number;
	failedCommitments: number;
	/** Ilk kanitini hic gondermeden suresi gecen taahhutler (cezasiz iptal). */
	cancelledGhosts: number;
	frozenUsers: number;
	unfrozenUsers: number;
}

const REMINDER_TEMPLATE: Record<'joined' | 'active' | 'completed', TemplateKey> = {
	joined: 'reminder_joined',
	active: 'reminder_active',
	completed: 'reminder_completed'
};

/**
 * Gunluk cron: (1) acik/yaklasan pencere hatirlatmalari, (2) kacirma -> missed/failed/
 * slot bosaltma/skor cezasi/freeze + bildirimler, (3) unfreeze taramasi.
 */
export async function runCron(now: Date = new Date()): Promise<CronResult> {
	const cron = await getSetting('cron');
	const score = await getSetting('score');
	const leadMs = cron.reminderLeadHours * 3_600_000;
	const n = now.getTime();

	const rows = await db
		.select({
			cpId: checkpoints.id,
			kind: checkpoints.kind,
			windowStart: checkpoints.windowStart,
			windowEnd: checkpoints.windowEnd,
			commitmentId: commitments.id,
			testerId: users.id,
			telegramId: users.telegramId,
			firstName: users.firstName,
			locale: users.locale,
			botStarted: users.botStarted,
			appId: apps.id,
			appName: apps.name
		})
		.from(checkpoints)
		.innerJoin(commitments, eq(checkpoints.commitmentId, commitments.id))
		.innerJoin(users, eq(commitments.testerId, users.id))
		.innerJoin(apps, eq(commitments.appId, apps.id))
		.where(and(eq(checkpoints.status, 'pending'), eq(commitments.status, 'active')));

	let reminders = 0;
	const missedCpIds: string[] = [];
	// commitmentId -> miss bilgisi (commitment basina tek kez ceza)
	const missByCommitment = new Map<string, (typeof rows)[number]>();

	for (const r of rows) {
		const ws = r.windowStart.getTime();
		const we = r.windowEnd.getTime();
		if (n > we) {
			missedCpIds.push(r.cpId);
			if (!missByCommitment.has(r.commitmentId)) missByCommitment.set(r.commitmentId, r);
		} else if (n >= ws - leadMs) {
			if (r.botStarted) {
				const ok = await sendTemplate(r.telegramId, REMINDER_TEMPLATE[r.kind], r.locale, {
					ad: r.firstName,
					app: r.appName,
					saat: countdownText(r.windowEnd, now)
				});
				if (ok) reminders++;
			}
		}
	}

	// Kacirilan checkpoint'leri missed yap.
	if (missedCpIds.length > 0) {
		await db
			.update(checkpoints)
			.set({ status: 'missed' })
			.where(inArray(checkpoints.id, missedCpIds));
	}

	// Hangi kacirilan commitment'lar en az 1 kanit (submitted checkpoint) almis?
	// Ilk kanitini bile gondermemis taahhutler "ghost"tur: slot tutmaz, ceza almaz.
	const missCmtIds = [...missByCommitment.keys()];
	const proofRows = missCmtIds.length
		? await db
				.selectDistinct({ commitmentId: checkpoints.commitmentId })
				.from(checkpoints)
				.where(
					and(inArray(checkpoints.commitmentId, missCmtIds), eq(checkpoints.status, 'submitted'))
				)
		: [];
	const engagedCommitments = new Set(proofRows.map((r) => r.commitmentId));

	const frozenThisRun = new Set<string>();
	let failedCommitments = 0;
	let cancelledGhosts = 0;

	for (const [commitmentId, info] of missByCommitment) {
		// Ghost: hic kanit gondermemis. Cezasiz iptal et (puan dusmez, freeze yok, slot zaten bostu).
		if (!engagedCommitments.has(commitmentId)) {
			const cancelled = await db
				.update(commitments)
				.set({ status: 'cancelled' })
				.where(and(eq(commitments.id, commitmentId), eq(commitments.status, 'active')))
				.returning({ id: commitments.id });
			if (cancelled.length > 0) cancelledGhosts++;
			continue;
		}

		// Commitment'i failed yap (sadece hala active ise).
		const failed = await db
			.update(commitments)
			.set({ status: 'failed' })
			.where(and(eq(commitments.id, commitmentId), eq(commitments.status, 'active')))
			.returning({ id: commitments.id });
		if (failed.length === 0) continue;
		failedCommitments++;

		// Skor cezasi.
		await applyScore({
			userId: info.testerId,
			delta: score.missPenalty,
			reason: 'checkpoint_missed',
			commitmentId
		});

		// App sahibine "tester kacirdi" bildirimi.
		await notifyOwner(info.appId, 'commitment_failed', { app: info.appName });

		// Tester'in app'lerini dondur (tester basina tek kez).
		if (!frozenThisRun.has(info.testerId)) {
			frozenThisRun.add(info.testerId);
			const frozenAppIds = await freezeUserApps(info.testerId);
			if (frozenAppIds.length > 0) {
				if (info.botStarted) {
					await sendTemplate(info.telegramId, 'app_frozen', info.locale, { ad: info.firstName });
				}
				await notifyFrozenAppTesters(frozenAppIds);
			}
		}
	}

	// Unfreeze taramasi: frozen app'i olan, bu kosuda donmamis ve aktif taahhudu kalmamis kullanicilar.
	const frozenOwners = await db
		.selectDistinct({ userId: apps.userId })
		.from(apps)
		.where(eq(apps.status, 'frozen'));

	let unfrozenUsers = 0;
	for (const o of frozenOwners) {
		if (frozenThisRun.has(o.userId)) continue; // ayni kosuda dondurulani atla
		if (await unfreezeIfClear(o.userId)) unfrozenUsers++;
	}

	return {
		reminders,
		missed: missedCpIds.length,
		failedCommitments,
		cancelledGhosts,
		frozenUsers: frozenThisRun.size,
		unfrozenUsers
	};
}

async function notifyOwner(
	appId: string,
	key: TemplateKey,
	vars: Record<string, string | number>
): Promise<void> {
	const rows = await db
		.select({
			telegramId: users.telegramId,
			locale: users.locale,
			botStarted: users.botStarted,
			firstName: users.firstName
		})
		.from(apps)
		.innerJoin(users, eq(apps.userId, users.id))
		.where(eq(apps.id, appId))
		.limit(1);
	if (rows.length === 0 || !rows[0].botStarted) return;
	await sendTemplate(rows[0].telegramId, key, rows[0].locale, { ad: rows[0].firstName, ...vars });
}

/** Donan app'lerde devam eden testerlere bilgilendirme DM'i. */
async function notifyFrozenAppTesters(appIds: string[]): Promise<void> {
	const rows = await db
		.select({
			telegramId: users.telegramId,
			locale: users.locale,
			botStarted: users.botStarted,
			firstName: users.firstName,
			appName: apps.name
		})
		.from(commitments)
		.innerJoin(users, eq(commitments.testerId, users.id))
		.innerJoin(apps, eq(commitments.appId, apps.id))
		.where(and(inArray(commitments.appId, appIds), eq(commitments.status, 'active')));

	for (const r of rows) {
		if (r.botStarted) {
			await sendTemplate(r.telegramId, 'app_frozen_tester_notice', r.locale, {
				ad: r.firstName,
				app: r.appName
			});
		}
	}
}
