import { and, count, desc, eq, gte, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from './db';
import { apps, checkpoints, commitments, users } from './db/schema';
import { getSetting } from './config';
import { escapeLike } from './security';

// ============================================================
// UYGULAMA MANTIGI: listeleme, slot sayimi, CRUD.
// Dolu slot = bu app'e bagli status IN ('active','completed') commitment sayisi.
// ============================================================

export interface AppListItem {
	id: string;
	name: string;
	packageName: string | null;
	appLink: string;
	groupLink: string;
	iconUrl: string | null;
	summary: string | null;
	description: string | null;
	slotsTotal: number;
	filled: number;
	free: number;
	dim: boolean;
	owner: {
		id: string;
		firstName: string;
		username: string | null;
		avatarUrl: string | null;
		score: number;
	};
}

export interface OwnedApp {
	id: string;
	name: string;
	packageName: string | null;
	appLink: string;
	groupLink: string;
	iconUrl: string | null;
	summary: string | null;
	category: string | null;
	description: string | null;
	instructions: { joined?: string; active?: string; completed?: string } | null;
	slotsTotal: number;
	filled: number;
	free: number;
	status: 'active' | 'frozen' | 'closed';
	createdAt: Date;
}

export interface AppInput {
	name: string;
	appLink: string;
	groupLink: string;
	packageName?: string | null;
	iconUrl?: string | null;
	summary?: string | null;
	category?: string | null;
	description?: string | null;
	slotsTotal?: number;
	instructions?: { joined?: string; active?: string; completed?: string } | null;
}

/**
 * Dolu slot sayilarini app_id -> filled seklinde doner.
 * Sayim: (status='completed') VEYA (en az bir submitted checkpoint var).
 * Kanit gondermemis 'active' commitment'lar slot tutmaz (kullanici onayi).
 */
async function filledByApp(appIds: string[]): Promise<Map<string, number>> {
	const map = new Map<string, number>();
	if (appIds.length === 0) return map;
	const rows = await db
		.select({ appId: commitments.appId, filled: count() })
		.from(commitments)
		.where(
			and(
				inArray(commitments.appId, appIds),
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
		)
		.groupBy(commitments.appId);
	for (const r of rows) map.set(r.appId, r.filled);
	return map;
}

export interface ListOptions {
	q?: string;
	page?: number;
	perPage?: number;
}
export interface PaginatedApps {
	items: AppListItem[];
	total: number;
	page: number;
	perPage: number;
	totalPages: number;
}

/**
 * Ana sayfa: katilima acik uygulamalar. Tek sorgu icinde:
 *  - filled (active|completed commitment sayisi) subquery ile join
 *  - serbest slot filtresi SQL'de
 *  - arama (name/packageName/owner firstName/username, ILIKE OR)
 *  - LIMIT/OFFSET sayfalama
 * Toplam sayim icin ek bir COUNT sorgusu (sayfalama icin tek seferlik).
 */
export async function listAvailableApps(opts: ListOptions = {}): Promise<PaginatedApps> {
	const page = Math.max(1, opts.page ?? 1);
	const perPage = Math.max(1, Math.min(50, opts.perPage ?? 15));
	const { dimBelow, hideBelow } = await getSetting('score');
	const q = opts.q?.trim() ?? '';

	// Slot sayimi: completed VEYA en az 1 submitted checkpoint'i olan commitment'lar.
	const filledSub = db
		.select({
			appId: commitments.appId,
			filled: count().as('filled')
		})
		.from(commitments)
		.where(
			and(
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
		)
		.groupBy(commitments.appId)
		.as('filled_sub');

	const baseConds = [
		eq(apps.status, 'active'),
		gte(users.score, hideBelow),
		sql`${apps.slotsTotal} > COALESCE(${filledSub.filled}, 0)`
	];

	if (q.length > 0) {
		// `%` ve `_` joker karakterlerini kacir: kullanici "100%" yazinca literal aransin.
		const pat = `%${escapeLike(q)}%`;
		const searchCond = or(
			ilike(apps.name, pat),
			ilike(apps.packageName, pat),
			ilike(users.firstName, pat),
			ilike(users.username, pat)
		);
		if (searchCond) baseConds.push(searchCond);
	}

	const where = and(...baseConds);

	const totalRows = await db
		.select({ c: count() })
		.from(apps)
		.innerJoin(users, eq(apps.userId, users.id))
		.leftJoin(filledSub, eq(filledSub.appId, apps.id))
		.where(where);
	const total = Number(totalRows[0]?.c ?? 0);
	const totalPages = Math.max(1, Math.ceil(total / perPage));
	const safePage = Math.min(page, totalPages);
	const offset = (safePage - 1) * perPage;

	const rows = await db
		.select({
			id: apps.id,
			name: apps.name,
			packageName: apps.packageName,
			appLink: apps.appLink,
			groupLink: apps.groupLink,
			iconUrl: apps.iconUrl,
			summary: apps.summary,
			description: apps.description,
			slotsTotal: apps.slotsTotal,
			filled: sql<number>`COALESCE(${filledSub.filled}, 0)`.as('filled'),
			ownerId: users.id,
			ownerFirstName: users.firstName,
			ownerUsername: users.username,
			ownerAvatar: users.avatarUrl,
			ownerScore: users.score
		})
		.from(apps)
		.innerJoin(users, eq(apps.userId, users.id))
		.leftJoin(filledSub, eq(filledSub.appId, apps.id))
		.where(where)
		.orderBy(desc(users.score), desc(apps.createdAt))
		.limit(perPage)
		.offset(offset);

	const items = rows.map((r) => {
		const f = Number(r.filled ?? 0);
		return {
			id: r.id,
			name: r.name,
			packageName: r.packageName,
			appLink: r.appLink,
			groupLink: r.groupLink,
			iconUrl: r.iconUrl,
			summary: r.summary,
			description: r.description,
			slotsTotal: r.slotsTotal,
			filled: f,
			free: r.slotsTotal - f,
			dim: r.ownerScore < dimBelow,
			owner: {
				id: r.ownerId,
				firstName: r.ownerFirstName,
				username: r.ownerUsername,
				avatarUrl: r.ownerAvatar,
				score: r.ownerScore
			}
		} satisfies AppListItem;
	});

	return { items, total, page: safePage, perPage, totalPages };
}

/** Kullanicinin kendi uygulamalari (slot durumlariyla). */
export async function listOwnedApps(userId: string): Promise<OwnedApp[]> {
	const rows = await db
		.select()
		.from(apps)
		.where(eq(apps.userId, userId))
		.orderBy(desc(apps.createdAt));

	const filled = await filledByApp(rows.map((r) => r.id));

	return rows.map((r) => {
		const f = filled.get(r.id) ?? 0;
		return {
			id: r.id,
			name: r.name,
			packageName: r.packageName,
			appLink: r.appLink,
			groupLink: r.groupLink,
			iconUrl: r.iconUrl,
			summary: r.summary,
			category: r.category,
			description: r.description,
			instructions: r.instructions ?? null,
			slotsTotal: r.slotsTotal,
			filled: f,
			free: r.slotsTotal - f,
			status: r.status,
			createdAt: r.createdAt
		};
	});
}

function deriveSummary(description: string | null | undefined): string | null {
	if (!description) return null;
	const t = description.trim().replace(/\s+/g, ' ');
	if (t.length === 0) return null;
	if (t.length <= 140) return t;
	return t.slice(0, 137).trimEnd() + '…';
}

function normalizeInstructions(input?: AppInput['instructions']) {
	if (!input) return null;
	const out: { joined?: string; active?: string; completed?: string } = {};
	if (input.joined?.trim()) out.joined = input.joined.trim();
	if (input.active?.trim()) out.active = input.active.trim();
	if (input.completed?.trim()) out.completed = input.completed.trim();
	return Object.keys(out).length ? out : null;
}

function validateInput(input: AppInput): void {
	if (!input.name?.trim()) throw new Error('Uygulama adı gerekli.');
	if (!isValidUrl(input.appLink)) throw new Error('Geçerli bir Play Store linki gir.');
	if (!isValidUrl(input.groupLink)) throw new Error('Geçerli bir Google Groups linki gir.');
	if (input.iconUrl?.trim() && !isValidUrl(input.iconUrl))
		throw new Error('Geçerli bir ikon URL gir (https://...).');
	// Slot araligi: 12-20 (Play Store 12 zorunlu, 20 üstü bu projenin politikasi).
	if (input.slotsTotal !== undefined) {
		if (!Number.isInteger(input.slotsTotal) || input.slotsTotal < 12 || input.slotsTotal > 20) {
			throw new Error('Slot sayısı 12 ile 20 arasında olmalı.');
		}
	}
}

function isValidUrl(s: string | undefined): boolean {
	if (!s) return false;
	try {
		const u = new URL(s);
		return u.protocol === 'http:' || u.protocol === 'https:';
	} catch {
		return false;
	}
}

/** Yeni uygulama ekler. Anti-abuse: ilk tamamlanan taahhutten once max app limiti. */
export async function createApp(userId: string, input: AppInput): Promise<string> {
	validateInput(input);

	const limits = await getSetting('limits');

	// Kullanici daha once tester olarak bir taahhut tamamlamis mi?
	const completed = await db
		.select({ c: count() })
		.from(commitments)
		.where(and(eq(commitments.testerId, userId), eq(commitments.status, 'completed')));
	const hasCompleted = (completed[0]?.c ?? 0) > 0;

	if (!hasCompleted) {
		const owned = await db.select({ c: count() }).from(apps).where(eq(apps.userId, userId));
		if ((owned[0]?.c ?? 0) >= limits.maxAppsBeforeFirstComplete) {
			throw new Error(
				`İlk test taahhüdünü tamamlayana kadar en fazla ${limits.maxAppsBeforeFirstComplete} uygulama ekleyebilirsin.`
			);
		}
	}

	const slots =
		input.slotsTotal && input.slotsTotal > 0 ? input.slotsTotal : limits.defaultSlotsTotal;

	const description = input.description?.trim() || null;
	const inserted = await db
		.insert(apps)
		.values({
			userId,
			name: input.name.trim(),
			appLink: input.appLink.trim(),
			groupLink: input.groupLink.trim(),
			packageName: input.packageName?.trim() || null,
			iconUrl: input.iconUrl?.trim() || null,
			summary: input.summary?.trim() || deriveSummary(description),
			category: input.category?.trim() || null,
			description,
			slotsTotal: slots,
			instructions: normalizeInstructions(input.instructions)
		})
		.returning({ id: apps.id });

	return inserted[0].id;
}

/** Sahibin kendi uygulamasini gunceller. */
export async function updateApp(userId: string, appId: string, input: AppInput): Promise<void> {
	validateInput(input);
	const owned = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
	if (owned.length === 0 || owned[0].userId !== userId) {
		throw new Error('Uygulama bulunamadı veya yetkin yok.');
	}

	const description = input.description?.trim() || null;
	await db
		.update(apps)
		.set({
			name: input.name.trim(),
			appLink: input.appLink.trim(),
			groupLink: input.groupLink.trim(),
			packageName: input.packageName?.trim() || null,
			iconUrl: input.iconUrl?.trim() || null,
			summary: input.summary?.trim() || deriveSummary(description),
			category: input.category?.trim() || null,
			description,
			...(input.slotsTotal && input.slotsTotal > 0 ? { slotsTotal: input.slotsTotal } : {}),
			instructions: normalizeInstructions(input.instructions)
		})
		.where(eq(apps.id, appId));
}

/** Sahip uygulamayi kapatir (active/frozen -> closed). Listede gorunmez, tester toplamaz. */
export async function closeApp(userId: string, appId: string): Promise<void> {
	const r = await db
		.update(apps)
		.set({ status: 'closed' })
		.where(
			and(eq(apps.id, appId), eq(apps.userId, userId), inArray(apps.status, ['active', 'frozen']))
		)
		.returning({ id: apps.id });
	if (r.length === 0) throw new Error('Uygulama kapatılamadı (zaten kapalı veya yetkin yok).');
}

/** Sahip kapali uygulamayi tekrar acar (closed -> active). */
export async function reopenApp(userId: string, appId: string): Promise<void> {
	const r = await db
		.update(apps)
		.set({ status: 'active' })
		.where(and(eq(apps.id, appId), eq(apps.userId, userId), eq(apps.status, 'closed')))
		.returning({ id: apps.id });
	if (r.length === 0) throw new Error('Uygulama açılamadı (kapalı değil veya yetkin yok).');
}

/** Sahibin kendi uygulamasini siler (bagli commitment'lar cascade). */
export async function deleteApp(userId: string, appId: string): Promise<void> {
	const owned = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
	if (owned.length === 0 || owned[0].userId !== userId) {
		throw new Error('Uygulama bulunamadı veya yetkin yok.');
	}
	await db.delete(apps).where(eq(apps.id, appId));
}
