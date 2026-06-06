import { and, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from './db';
import { txDb } from './db/pool';
import { apps, checkpoints, commitments, users } from './db/schema';
import { getSetting } from './config';
import { computeWindows } from '$lib/utils/checkpoint';
import { applyScore } from './score';
import { sendTemplate } from './notify';

// ============================================================
// TAAHHUT (COMMITMENT) MANTIGI
// ============================================================

/**
 * Dusuk seviye: yaris kosulu korumasi icin app satirini FOR UPDATE ile kilitleyen
 * interaktif transaction icinde commitment + 3 checkpoint olusturur. CAGIRAN tarafin
 * dogrulamasi gereken kontroller (zaten uye mi vs.) burada yapilmaz - sadece slot ve
 * status. Trade matching ve karsiliksiz join uzerine bina edilir.
 */
async function insertCommitmentTx(testerId: string, appId: string): Promise<string> {
	const windows = await getSetting('checkpoint_windows');

	return txDb().transaction(async (trx) => {
		const appRows = await trx.select().from(apps).where(eq(apps.id, appId)).for('update');
		if (appRows.length === 0) throw new Error('Uygulama bulunamadı.');
		const app = appRows[0];

		if (app.status !== 'active') throw new Error('Bu uygulama şu an tester alamıyor.');
		if (app.userId === testerId) throw new Error('Kendi uygulamana katılamazsın.');

		// Slot doluluk: sadece (completed) veya (en az bir submitted checkpoint'i olan)
		// commitment'lar sayilir. Henuz kanit gondermemis 'active' commitment slot tutmaz.
		const filledRows = await trx
			.select({ c: count() })
			.from(commitments)
			.where(
				and(
					eq(commitments.appId, appId),
					inArray(commitments.status, ['active', 'completed']),
					sql`(
						${commitments.status} = 'completed'
						OR EXISTS (
							SELECT 1 FROM ${checkpoints}
							WHERE ${checkpoints.commitmentId} = ${commitments.id}
							  AND ${checkpoints.status} = 'submitted'
						)
					)`
				)
			);
		if ((filledRows[0]?.c ?? 0) >= app.slotsTotal) throw new Error('Boş slot kalmamış.');

		const existing = await trx
			.select({ id: commitments.id })
			.from(commitments)
			.where(
				and(
					eq(commitments.testerId, testerId),
					eq(commitments.appId, appId),
					inArray(commitments.status, ['active', 'completed'])
				)
			);
		if (existing.length > 0) throw new Error('Bu uygulamaya zaten katıldın.');

		const startedAt = new Date();
		const inserted = await trx
			.insert(commitments)
			.values({ testerId, appId, status: 'active', startedAt })
			.returning({ id: commitments.id });
		const commitmentId = inserted[0].id;

		const ws = computeWindows(startedAt, windows);
		await trx.insert(checkpoints).values(
			ws.map((w) => ({
				commitmentId,
				kind: w.kind,
				windowStart: w.windowStart,
				windowEnd: w.windowEnd
			}))
		);

		return commitmentId;
	});
}

/**
 * Karsiliksiz (free) katilma: kullanici hicbir sey beklemeden app'i test edecegini
 * taahhut eder. App sahibine 'free_joined' DM'i gider.
 */
export async function joinAppFree(testerId: string, appId: string): Promise<string> {
	const commitmentId = await insertCommitmentTx(testerId, appId);
	// Sahibe bildirim (fire-and-forget; bildirim hatasi join'i bozmaz).
	notifyOwnerFreeJoin(appId, testerId).catch((e) =>
		console.warn('[notify] free_joined gonderilemedi:', e)
	);
	return commitmentId;
}

/** Geriye uyumluluk: eski cagrim adi 'joinApp' (varsayilan = free join). */
export async function joinApp(testerId: string, appId: string): Promise<string> {
	return joinAppFree(testerId, appId);
}

/**
 * Trade match flow: iki commitment'i (A→targetX, B→targetY) tek transaction'da
 * uretmek yerine sirayli iki ayri transaction kullaniyoruz - her biri kendi app
 * satirinda FOR UPDATE alir. Calistirma sirasi: requester (A) once, sonra owner (B).
 * Iki taahhut da basariyla acilirsa Match. Birisi cakirsa (ornegin zaten tester'sa)
 * cagiran taraf hatayi yakalar; istek requested'da kalir.
 */
export async function createTradeCommitments(
	requesterId: string,
	targetAppId: string,
	ownerId: string,
	offeredAppId: string
): Promise<{ requesterCommitmentId: string; ownerCommitmentId: string }> {
	const requesterCommitmentId = await insertCommitmentTx(requesterId, targetAppId);
	const ownerCommitmentId = await insertCommitmentTx(ownerId, offeredAppId);
	return { requesterCommitmentId, ownerCommitmentId };
}

async function notifyOwnerFreeJoin(appId: string, testerId: string): Promise<void> {
	const rows = await db
		.select({
			ownerTelegramId: users.telegramId,
			ownerLocale: users.locale,
			ownerBotStarted: users.botStarted,
			appName: apps.name
		})
		.from(apps)
		.innerJoin(users, eq(apps.userId, users.id))
		.where(eq(apps.id, appId))
		.limit(1);
	if (rows.length === 0 || !rows[0].ownerBotStarted) return;

	const tester = await db
		.select({ firstName: users.firstName })
		.from(users)
		.where(eq(users.id, testerId))
		.limit(1);

	await sendTemplate(rows[0].ownerTelegramId, 'free_joined', rows[0].ownerLocale, {
		ad: tester[0]?.firstName ?? 'Bir tester',
		app: rows[0].appName
	});
}

/**
 * Admin: bir taahhudu zorla iptal eder. Kanit gonderilmis olsa bile gecerli
 * (sahip/owner kuralinin uzerine cikma yetkisi yalniz admindedir).
 * Tester'a bilgilendirme DM'i atilir. Caller mutlaka admin oldugunu dogrulamali.
 */
export async function adminCancelCommitment(commitmentId: string): Promise<void> {
	const rows = await db
		.select({ commitment: commitments, app: apps })
		.from(commitments)
		.innerJoin(apps, eq(commitments.appId, apps.id))
		.where(eq(commitments.id, commitmentId))
		.limit(1);
	if (rows.length === 0) throw new Error('Taahhüt bulunamadı.');
	const { commitment, app } = rows[0];
	if (commitment.status !== 'active') throw new Error('Bu taahhüt zaten kapanmış.');

	await db
		.update(commitments)
		.set({ status: 'cancelled' })
		.where(eq(commitments.id, commitmentId));

	const tester = await db
		.select({
			telegramId: users.telegramId,
			firstName: users.firstName,
			locale: users.locale,
			botStarted: users.botStarted
		})
		.from(users)
		.where(eq(users.id, commitment.testerId))
		.limit(1);
	if (tester.length && tester[0].botStarted) {
		await sendTemplate(tester[0].telegramId, 'tester_removed_by_admin', tester[0].locale, {
			ad: tester[0].firstName,
			app: app.name
		});
	}
}

/** Kullanicinin slot isgal eden (active/completed) taahhutlerinin app id'leri. */
export async function getJoinedAppIds(userId: string): Promise<string[]> {
	const rows = await db
		.select({ appId: commitments.appId })
		.from(commitments)
		.where(
			and(eq(commitments.testerId, userId), inArray(commitments.status, ['active', 'completed']))
		);
	return rows.map((r) => r.appId);
}

/**
 * Iptal: tester gonullu birakir VEYA app sahibi tester'i cikarir.
 * KISIT: Herhangi bir checkpoint'te kanit gonderildiyse (status='submitted')
 * taahhut artik baglayicidir; iptal mumkun degil (sadece admin mudahale eder).
 */
export async function cancelCommitment(userId: string, commitmentId: string): Promise<void> {
	const rows = await db
		.select({ commitment: commitments, app: apps })
		.from(commitments)
		.innerJoin(apps, eq(commitments.appId, apps.id))
		.where(eq(commitments.id, commitmentId))
		.limit(1);
	if (rows.length === 0) throw new Error('Taahhüt bulunamadı.');

	const { commitment, app } = rows[0];
	const isTester = commitment.testerId === userId;
	const isOwner = app.userId === userId;
	if (!isTester && !isOwner) throw new Error('Yetkin yok.');
	if (commitment.status !== 'active') throw new Error('Bu taahhüt zaten kapanmış.');

	// Kanit verildi mi? Herhangi bir submitted checkpoint varsa iptal yasak.
	const submitted = await db
		.select({ c: count() })
		.from(checkpoints)
		.where(and(eq(checkpoints.commitmentId, commitmentId), eq(checkpoints.status, 'submitted')));
	if ((submitted[0]?.c ?? 0) > 0) {
		throw new Error('Kanıt gönderildikten sonra taahhüt sonlandırılamaz.');
	}

	await db.update(commitments).set({ status: 'cancelled' }).where(eq(commitments.id, commitmentId));

	// Sahip cikardiysa testere bilgilendirme DM'i (gonullu birakmada gerekmez).
	if (isOwner && !isTester) {
		const tester = await db
			.select({
				telegramId: users.telegramId,
				firstName: users.firstName,
				locale: users.locale,
				botStarted: users.botStarted
			})
			.from(users)
			.where(eq(users.id, commitment.testerId))
			.limit(1);
		if (tester.length && tester[0].botStarted) {
			await sendTemplate(tester[0].telegramId, 'tester_removed_by_owner', tester[0].locale, {
				ad: tester[0].firstName,
				app: app.name
			});
		}
	}
}

/**
 * Bu app'in BENDEN BASKA en son katilan aktif tester'i son 7 gun icinde katildiysa,
 * uygulamayi silmeden once kac gun daha tutmasi gerektigini doner; aksi halde null.
 * Amac: Play Store kapali test'in "kesintisiz 14 gun 12 tester" kuralinda son katilanin
 * 14 gun penceresi tamamlanana kadar bu tester'in da app'i silmemesini rica etmek.
 */
async function computeKeepInstalledHint(
	testerId: string,
	appId: string
): Promise<number | null> {
	const rows = await db
		.select({ startedAt: commitments.startedAt })
		.from(commitments)
		.where(
			and(
				eq(commitments.appId, appId),
				eq(commitments.status, 'active'),
				ne(commitments.testerId, testerId)
			)
		)
		.orderBy(desc(commitments.startedAt))
		.limit(1);
	if (rows.length === 0) return null;
	const daysSinceLatest = (Date.now() - rows[0].startedAt.getTime()) / 86_400_000;
	if (daysSinceLatest > 7) return null;
	const remaining = Math.ceil(14 - daysSinceLatest);
	return remaining > 0 ? remaining : null;
}

/**
 * Checkpoint kaniti yukleme. Pencere acik + pending olmali. Son checkpoint
 * (completed) submit olunca commitment tamamlanir, skor odulu + unfreeze + bildirim.
 * Donus: { completed, keepInstalledDays } - son checkpoint ise client'a "uygulamayi
 * silmeyin X gun" uyarisi gostermek icin kullanilir (keepInstalledDays null = uyari yok).
 */
export interface SubmitResult {
	completed: boolean;
	keepInstalledDays: number | null;
}

export async function submitCheckpoint(
	testerId: string,
	checkpointId: string,
	screenshots: { url: string; shareUrl: string }[]
): Promise<SubmitResult> {
	if (!screenshots.length) throw new Error('En az bir ekran görüntüsü gerekli.');

	const rows = await db
		.select({ checkpoint: checkpoints, commitment: commitments })
		.from(checkpoints)
		.innerJoin(commitments, eq(checkpoints.commitmentId, commitments.id))
		.where(eq(checkpoints.id, checkpointId))
		.limit(1);
	if (rows.length === 0) throw new Error('Checkpoint bulunamadı.');

	const { checkpoint, commitment } = rows[0];
	if (commitment.testerId !== testerId) throw new Error('Yetkin yok.');
	if (commitment.status !== 'active') throw new Error('Bu taahhüt aktif değil.');
	if (checkpoint.status !== 'pending') throw new Error('Bu checkpoint zaten kapanmış.');

	const now = Date.now();
	if (now < checkpoint.windowStart.getTime()) throw new Error('Bu kontrol noktası henüz açılmadı.');
	if (now > checkpoint.windowEnd.getTime())
		throw new Error('Bu kontrol noktasının penceresi kapandı.');

	await db
		.update(checkpoints)
		.set({ status: 'submitted', screenshots, submittedAt: new Date() })
		.where(eq(checkpoints.id, checkpointId));

	// Son checkpoint -> taahhut tamamlandi.
	let keepInstalledDays: number | null = null;
	if (checkpoint.kind === 'completed') {
		await db
			.update(commitments)
			.set({ status: 'completed', completedAt: new Date() })
			.where(eq(commitments.id, commitment.id));

		const score = await getSetting('score');
		await applyScore({
			userId: testerId,
			delta: score.completeReward,
			reason: 'commitment_completed',
			commitmentId: commitment.id
		});

		await notifyOwnerCompleted(commitment.appId, testerId);
		await unfreezeIfClear(testerId);

		// "Lutfen X gun daha silmeyin" ipucu - sonradan katilanin Play Store
		// 14 gun penceresinin tamamlanmasi icin.
		keepInstalledDays = await computeKeepInstalledHint(testerId, commitment.appId);
	}

	return { completed: checkpoint.kind === 'completed', keepInstalledDays };
}

/** Kullanicinin aktif (status='active') taahhudu kalmadiysa frozen app'lerini acar. */
export async function unfreezeIfClear(userId: string): Promise<boolean> {
	const active = await db
		.select({ c: count() })
		.from(commitments)
		.where(and(eq(commitments.testerId, userId), eq(commitments.status, 'active')));
	if ((active[0]?.c ?? 0) > 0) return false;

	const unfrozen = await db
		.update(apps)
		.set({ status: 'active' })
		.where(and(eq(apps.userId, userId), eq(apps.status, 'frozen')))
		.returning({ id: apps.id });

	if (unfrozen.length > 0) {
		const u = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		if (u.length && u[0].botStarted) {
			await sendTemplate(u[0].telegramId, 'app_unfrozen', u[0].locale, { ad: u[0].firstName });
		}
	}
	return unfrozen.length > 0;
}

/** Kullanicinin aktif app'lerini dondurur (bir taahhut kacinca - cron Faz 4). Donan app id'leri. */
export async function freezeUserApps(userId: string): Promise<string[]> {
	const frozen = await db
		.update(apps)
		.set({ status: 'frozen' })
		.where(and(eq(apps.userId, userId), eq(apps.status, 'active')))
		.returning({ id: apps.id });
	return frozen.map((f) => f.id);
}

async function notifyOwnerCompleted(appId: string, testerId: string): Promise<void> {
	const rows = await db
		.select({
			ownerTelegramId: users.telegramId,
			ownerLocale: users.locale,
			ownerBotStarted: users.botStarted,
			appName: apps.name
		})
		.from(apps)
		.innerJoin(users, eq(apps.userId, users.id))
		.where(eq(apps.id, appId))
		.limit(1);
	if (rows.length === 0 || !rows[0].ownerBotStarted) return;

	const tester = await db
		.select({ firstName: users.firstName })
		.from(users)
		.where(eq(users.id, testerId))
		.limit(1);

	await sendTemplate(rows[0].ownerTelegramId, 'commitment_completed', rows[0].ownerLocale, {
		ad: tester[0]?.firstName ?? 'Bir tester',
		app: rows[0].appName
	});
}

// --- Listeleme ---
export interface MyCheckpoint {
	id: string;
	kind: 'joined' | 'active' | 'completed';
	windowStart: Date;
	windowEnd: Date;
	status: 'pending' | 'submitted' | 'missed';
	screenshots: { url: string; shareUrl: string }[] | null;
	submittedAt: Date | null;
}
export interface MyCommitment {
	id: string;
	status: 'active' | 'completed' | 'failed' | 'cancelled';
	startedAt: Date;
	completedAt: Date | null;
	app: {
		id: string;
		name: string;
		appLink: string;
		groupLink: string;
		instructions: { joined?: string; active?: string; completed?: string } | null;
	};
	checkpoints: MyCheckpoint[];
}

// --- App sahibi gorunumu (testerlar + kanitlar) ---
export interface OwnerCommitmentView {
	id: string;
	status: 'active' | 'completed' | 'failed' | 'cancelled';
	startedAt: Date;
	tester: { id: string; firstName: string; username: string | null };
	checkpoints: {
		kind: 'joined' | 'active' | 'completed';
		status: 'pending' | 'submitted' | 'missed';
		screenshots: { url: string; shareUrl: string }[] | null;
		submittedAt: Date | null;
	}[];
}

/**
 * Bir app icin tum tester taahhutleri + kanitlari. Ortak query;
 * `requireOwnerId` verilirse o user'in sahibi olmasi zorunlu (regular flow).
 * Admin tarafindan cagrildiginda null gecirilir, sahiplik kontrolu atlanir.
 */
async function loadAppCommitments(
	appId: string,
	requireOwnerId: string | null
): Promise<{ appName: string; ownerId: string; commitments: OwnerCommitmentView[] }> {
	const appRows = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
	if (appRows.length === 0) throw new Error('Uygulama bulunamadı.');
	if (requireOwnerId !== null && appRows[0].userId !== requireOwnerId) {
		throw new Error('Yetkin yok.');
	}

	const rows = await db
		.select({
			id: commitments.id,
			status: commitments.status,
			startedAt: commitments.startedAt,
			testerId: users.id,
			firstName: users.firstName,
			username: users.username
		})
		.from(commitments)
		.innerJoin(users, eq(commitments.testerId, users.id))
		.where(eq(commitments.appId, appId))
		.orderBy(desc(commitments.createdAt));

	const ids = rows.map((r) => r.id);
	const cps = ids.length
		? await db.select().from(checkpoints).where(inArray(checkpoints.commitmentId, ids))
		: [];
	const order = { joined: 0, active: 1, completed: 2 };
	const byC = new Map<string, OwnerCommitmentView['checkpoints']>();
	for (const cp of cps) {
		const list = byC.get(cp.commitmentId) ?? [];
		list.push({
			kind: cp.kind,
			status: cp.status,
			screenshots: cp.screenshots ?? null,
			submittedAt: cp.submittedAt
		});
		byC.set(cp.commitmentId, list);
	}

	return {
		appName: appRows[0].name,
		ownerId: appRows[0].userId,
		commitments: rows.map((r) => ({
			id: r.id,
			status: r.status,
			startedAt: r.startedAt,
			tester: { id: r.testerId, firstName: r.firstName, username: r.username },
			checkpoints: (byC.get(r.id) ?? []).sort((a, b) => order[a.kind] - order[b.kind])
		}))
	};
}

/** App sahibinin, kendi uygulamasindaki testerlarin taahhut + kanitlarini gormesi. */
export async function listAppCommitmentsForOwner(
	ownerId: string,
	appId: string
): Promise<{ appName: string; commitments: OwnerCommitmentView[] }> {
	const { appName, commitments } = await loadAppCommitments(appId, ownerId);
	return { appName, commitments };
}

/** Admin: ANY app icin testerlar + kanitlar (sahiplik kontrolu YOK). */
export async function listAppCommitmentsForAdmin(
	appId: string
): Promise<{ appName: string; ownerId: string; commitments: OwnerCommitmentView[] }> {
	return loadAppCommitments(appId, null);
}

/** Kullanicinin taahhutleri (app + checkpoint'lerle). */
export async function listMyCommitments(testerId: string): Promise<MyCommitment[]> {
	const rows = await db
		.select({ commitment: commitments, app: apps })
		.from(commitments)
		.innerJoin(apps, eq(commitments.appId, apps.id))
		.where(eq(commitments.testerId, testerId))
		.orderBy(desc(commitments.createdAt));
	if (rows.length === 0) return [];

	const ids = rows.map((r) => r.commitment.id);
	const cps = await db.select().from(checkpoints).where(inArray(checkpoints.commitmentId, ids));

	const byCommitment = new Map<string, MyCheckpoint[]>();
	for (const cp of cps) {
		const list = byCommitment.get(cp.commitmentId) ?? [];
		list.push({
			id: cp.id,
			kind: cp.kind,
			windowStart: cp.windowStart,
			windowEnd: cp.windowEnd,
			status: cp.status,
			screenshots: cp.screenshots ?? null,
			submittedAt: cp.submittedAt
		});
		byCommitment.set(cp.commitmentId, list);
	}

	const order = { joined: 0, active: 1, completed: 2 };
	return rows.map((r) => ({
		id: r.commitment.id,
		status: r.commitment.status,
		startedAt: r.commitment.startedAt,
		completedAt: r.commitment.completedAt,
		app: {
			id: r.app.id,
			name: r.app.name,
			appLink: r.app.appLink,
			groupLink: r.app.groupLink,
			instructions: r.app.instructions ?? null
		},
		checkpoints: (byCommitment.get(r.commitment.id) ?? []).sort(
			(a, b) => order[a.kind] - order[b.kind]
		)
	}));
}
