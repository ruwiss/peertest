import { and, count, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { db } from './db';
import { apps, commitments, reports, users } from './db/schema';
import { applyScore } from './score';
import { getSetting } from './config';
import { escapeLike } from './security';
import { sendTemplate } from './notify';

export interface AdminUser {
	id: string;
	telegramId: number;
	firstName: string;
	username: string | null;
	score: number;
	role: 'user' | 'admin';
	botStarted: boolean;
	completedCount: number;
	reportsAgainst: number;
}

/** Kullanicilari arar (ad/username/telegram_id) + tamamlanan taahhut ve aleyhte rapor sayilari. */
export async function listUsers(query?: string): Promise<AdminUser[]> {
	const q = query?.trim();
	let where;
	if (q) {
		const pat = `%${escapeLike(q)}%`;
		const conds = [ilike(users.firstName, pat), ilike(users.username, pat)];
		if (/^\d+$/.test(q)) conds.push(eq(users.telegramId, Number(q)));
		where = or(...conds);
	}

	const us = await db.select().from(users).where(where).orderBy(desc(users.createdAt)).limit(100);
	if (us.length === 0) return [];

	const ids = us.map((u) => u.id);
	// Tamamlanan + rapor sayilari paralel: birbirine baglilik yok.
	const [completed, rep] = await Promise.all([
		db
			.select({ testerId: commitments.testerId, c: count() })
			.from(commitments)
			.where(and(inArray(commitments.testerId, ids), eq(commitments.status, 'completed')))
			.groupBy(commitments.testerId),
		db
			.select({ reportedId: reports.reportedId, c: count() })
			.from(reports)
			.where(inArray(reports.reportedId, ids))
			.groupBy(reports.reportedId)
	]);

	const cMap = new Map(completed.map((r) => [r.testerId, r.c]));
	const rMap = new Map(rep.map((r) => [r.reportedId, r.c]));

	return us.map((u) => ({
		id: u.id,
		telegramId: u.telegramId,
		firstName: u.firstName,
		username: u.username,
		score: u.score,
		role: u.role,
		botStarted: u.botStarted,
		completedCount: cMap.get(u.id) ?? 0,
		reportsAgainst: rMap.get(u.id) ?? 0
	}));
}

/** Admin puan ayarlamasi (delta). Pozitif=odul, negatif=ceza. */
export async function adjustScore(
	adminId: string,
	userId: string,
	delta: number,
	note?: string
): Promise<void> {
	if (!delta) return;
	await applyScore({
		userId,
		delta,
		reason: delta < 0 ? 'admin_penalty' : 'admin_reward',
		actorId: adminId,
		note: note ?? null
	});
}

/** Shadowban: puani hideBelow esiginin altina ceker (uygulamalari gizlenir). */
export async function shadowban(adminId: string, userId: string): Promise<void> {
	const { hideBelow } = await getSetting('score');
	const u = await db
		.select({ score: users.score })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	if (u.length === 0) throw new Error('Kullanıcı bulunamadı.');
	const target = hideBelow - 1;
	const delta = target - u[0].score;
	await applyScore({ userId, delta, reason: 'admin_penalty', actorId: adminId, note: 'shadowban' });
}

export async function deleteUser(userId: string): Promise<void> {
	await db.delete(users).where(eq(users.id, userId));
}

export interface FrozenAppView {
	id: string;
	name: string;
	owner: { id: string; firstName: string; username: string | null };
}

export async function listFrozenApps(): Promise<FrozenAppView[]> {
	const rows = await db
		.select({
			id: apps.id,
			name: apps.name,
			ownerId: users.id,
			ownerFirstName: users.firstName,
			ownerUsername: users.username
		})
		.from(apps)
		.innerJoin(users, eq(apps.userId, users.id))
		.where(eq(apps.status, 'frozen'))
		.orderBy(desc(apps.createdAt));
	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		owner: { id: r.ownerId, firstName: r.ownerFirstName, username: r.ownerUsername }
	}));
}

export interface AdminUserDetail {
	user: {
		id: string;
		telegramId: number;
		firstName: string;
		username: string | null;
		avatarUrl: string | null;
		score: number;
		role: 'user' | 'admin';
		botStarted: boolean;
		createdAt: Date;
	};
	apps: Array<{
		id: string;
		name: string;
		packageName: string | null;
		iconUrl: string | null;
		status: 'active' | 'frozen' | 'closed';
		slotsTotal: number;
		filled: number;
		createdAt: Date;
	}>;
	commitments: Array<{
		id: string;
		status: 'active' | 'completed' | 'failed' | 'cancelled';
		startedAt: Date;
		appId: string;
		appName: string;
		appPackageName: string | null;
	}>;
}

export async function getUserDetail(userId: string): Promise<AdminUserDetail | null> {
	// Kullanici + sahip oldugu app'ler + tester taahhutleri paralel.
	const [ur, ownedRows, cmtRows] = await Promise.all([
		db.select().from(users).where(eq(users.id, userId)).limit(1),
		db.select().from(apps).where(eq(apps.userId, userId)).orderBy(desc(apps.createdAt)),
		db
			.select({
				id: commitments.id,
				status: commitments.status,
				startedAt: commitments.startedAt,
				appId: commitments.appId,
				appName: apps.name,
				appPackageName: apps.packageName
			})
			.from(commitments)
			.innerJoin(apps, eq(commitments.appId, apps.id))
			.where(eq(commitments.testerId, userId))
			.orderBy(desc(commitments.startedAt))
			.limit(100)
	]);
	if (ur.length === 0) return null;
	const u = ur[0];

	const appIds = ownedRows.map((a) => a.id);
	const filled = new Map<string, number>();
	if (appIds.length > 0) {
		const rows = await db
			.select({ appId: commitments.appId, c: count() })
			.from(commitments)
			.where(
				and(
					inArray(commitments.appId, appIds),
					inArray(commitments.status, ['active', 'completed'])
				)
			)
			.groupBy(commitments.appId);
		for (const r of rows) filled.set(r.appId, r.c);
	}

	return {
		user: {
			id: u.id,
			telegramId: u.telegramId,
			firstName: u.firstName,
			username: u.username,
			avatarUrl: u.avatarUrl,
			score: u.score,
			role: u.role,
			botStarted: u.botStarted,
			createdAt: u.createdAt
		},
		apps: ownedRows.map((a) => ({
			id: a.id,
			name: a.name,
			packageName: a.packageName,
			iconUrl: a.iconUrl,
			status: a.status,
			slotsTotal: a.slotsTotal,
			filled: filled.get(a.id) ?? 0,
			createdAt: a.createdAt
		})),
		commitments: cmtRows
	};
}

/**
 * Admin: bir uygulamayi tamamen siler (cascade: commitments + checkpoints).
 * Sahibe bilgilendirme DM'i atilir.
 */
export async function adminDeleteApp(appId: string): Promise<void> {
	const appRow = await db
		.select({
			id: apps.id,
			name: apps.name,
			ownerTelegramId: users.telegramId,
			ownerLocale: users.locale,
			ownerFirstName: users.firstName,
			ownerBotStarted: users.botStarted
		})
		.from(apps)
		.innerJoin(users, eq(apps.userId, users.id))
		.where(eq(apps.id, appId))
		.limit(1);
	if (appRow.length === 0) throw new Error('Uygulama bulunamadı.');
	const a = appRow[0];

	await db.delete(apps).where(eq(apps.id, appId));

	if (a.ownerBotStarted) {
		await sendTemplate(a.ownerTelegramId, 'app_deleted_by_admin', a.ownerLocale, {
			ad: a.ownerFirstName,
			app: a.name
		});
	}
}

/** Admin manuel unfreeze: kullanicinin tum frozen app'lerini aktiflestirir. */
export async function manualUnfreeze(userId: string): Promise<number> {
	const r = await db
		.update(apps)
		.set({ status: 'active' })
		.where(and(eq(apps.userId, userId), eq(apps.status, 'frozen')))
		.returning({ id: apps.id });
	return r.length;
}
