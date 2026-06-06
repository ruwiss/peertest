import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from './db';
import { apps, trades, users } from './db/schema';
import { createTradeCommitments } from './commitment';
import { sendTemplate } from './notify';

// ============================================================
// TRADE (KARSILIKLI TEST TAKASI) MANTIGI
// ============================================================
// A kullanicisi B'nin app'inde test etmek istiyor. A'nin kendi app'i de var.
// Modal'da "karşılıklı" secip kendi app'lerinden birini sunuyor (offered).
//
// Akis:
// 1) A katil → createTradeRequest(requesterId=A, targetAppId=X, offeredAppId=Y)
//    Eger B daha once (requesterId=B, targetAppId=Y, offeredAppId=X) acmissa MATCH:
//      → 2 commitment olusturulur, iki trade satiri 'matched'.
//      → Iki kullaniciya da 'trade_matched' DM'i gider.
//    Eger eslesme yoksa kayit acilir + B'ye 'trade_requested' DM'i gider.
// 2) B sonradan ayni cifti acarsa adim 1'deki matched bran cikar.

export interface TradeRequestRow {
	id: string;
	status: 'requested' | 'matched' | 'cancelled';
	createdAt: Date;
	matchedAt: Date | null;
	target: {
		appId: string;
		appName: string;
		packageName: string | null;
		ownerId: string;
		ownerName: string;
	};
	offered: { appId: string; appName: string; packageName: string | null };
}

/**
 * Kullanicinin acmis oldugu trade istekleri (her statu).
 */
export async function listMyTrades(userId: string): Promise<TradeRequestRow[]> {
	// Drizzle alias yapmadan iki ayri join secimi: target ve offered app icin ayri sorgular gerekir.
	// Tek query'de iki ayri innerJoin ayni 'apps' tablosuna calismaz; iki sorgu daha basit/okunabilir.
	const rows = await db
		.select({
			id: trades.id,
			status: trades.status,
			createdAt: trades.createdAt,
			matchedAt: trades.matchedAt,
			targetAppId: trades.targetAppId,
			offeredAppId: trades.offeredAppId
		})
		.from(trades)
		.where(eq(trades.requesterId, userId))
		.orderBy(desc(trades.createdAt))
		.limit(50);
	if (rows.length === 0) return [];

	const appIds = Array.from(new Set(rows.flatMap((r) => [r.targetAppId, r.offeredAppId])));
	const appInfo = await db
		.select({
			id: apps.id,
			name: apps.name,
			packageName: apps.packageName,
			ownerId: apps.userId,
			ownerName: users.firstName
		})
		.from(apps)
		.innerJoin(users, eq(apps.userId, users.id))
		.where(inArray(apps.id, appIds));
	const aMap = new Map(appInfo.map((a) => [a.id, a]));

	return rows.map((r) => {
		const tApp = aMap.get(r.targetAppId);
		const oApp = aMap.get(r.offeredAppId);
		return {
			id: r.id,
			status: r.status,
			createdAt: r.createdAt,
			matchedAt: r.matchedAt,
			target: {
				appId: r.targetAppId,
				appName: tApp?.name ?? '?',
				packageName: tApp?.packageName ?? null,
				ownerId: tApp?.ownerId ?? '',
				ownerName: tApp?.ownerName ?? '?'
			},
			offered: {
				appId: r.offeredAppId,
				appName: oApp?.name ?? '?',
				packageName: oApp?.packageName ?? null
			}
		};
	});
}

/**
 * Bana yönelik (benim app'ime yapilmis) trade istekleri.
 */
export async function listTradesTowardsMe(userId: string): Promise<TradeRequestRow[]> {
	// Benim app'lerimden birine yapilan istekler.
	const myAppRows = await db
		.select({ id: apps.id })
		.from(apps)
		.where(eq(apps.userId, userId));
	if (myAppRows.length === 0) return [];
	const myAppIds = myAppRows.map((a) => a.id);

	const rows = await db
		.select({
			id: trades.id,
			status: trades.status,
			createdAt: trades.createdAt,
			matchedAt: trades.matchedAt,
			requesterId: trades.requesterId,
			targetAppId: trades.targetAppId,
			offeredAppId: trades.offeredAppId
		})
		.from(trades)
		.where(and(inArray(trades.targetAppId, myAppIds), eq(trades.status, 'requested')))
		.orderBy(desc(trades.createdAt))
		.limit(50);

	if (rows.length === 0) return [];

	const appIds = Array.from(new Set(rows.flatMap((r) => [r.targetAppId, r.offeredAppId])));
	const appInfo = await db
		.select({
			id: apps.id,
			name: apps.name,
			packageName: apps.packageName,
			ownerId: apps.userId,
			ownerName: users.firstName
		})
		.from(apps)
		.innerJoin(users, eq(apps.userId, users.id))
		.where(inArray(apps.id, appIds));
	const aMap = new Map(appInfo.map((a) => [a.id, a]));

	return rows.map((r) => {
		const tApp = aMap.get(r.targetAppId);
		const oApp = aMap.get(r.offeredAppId);
		return {
			id: r.id,
			status: r.status,
			createdAt: r.createdAt,
			matchedAt: r.matchedAt,
			target: {
				appId: r.targetAppId,
				appName: tApp?.name ?? '?',
				packageName: tApp?.packageName ?? null,
				ownerId: tApp?.ownerId ?? '',
				ownerName: tApp?.ownerName ?? '?'
			},
			offered: {
				appId: r.offeredAppId,
				appName: oApp?.name ?? '?',
				packageName: oApp?.packageName ?? null
			}
		};
	});
}

/**
 * Trade istegi olustur. Karşi taraf da daha once teklif gondermisse otomatik MATCH.
 *
 * @returns Olusan trade'in id'si ve durumu (matched veya requested).
 */
export async function createTradeRequest(
	requesterId: string,
	targetAppId: string,
	offeredAppId: string
): Promise<{ tradeId: string; matched: boolean }> {
	// 1) Onerilen app gercekten requester'a ait mi + aktif mi?
	const offered = await db
		.select({ id: apps.id, userId: apps.userId, status: apps.status, name: apps.name })
		.from(apps)
		.where(eq(apps.id, offeredAppId))
		.limit(1);
	if (offered.length === 0 || offered[0].userId !== requesterId) {
		throw new Error('Önerdiğin uygulama sana ait değil.');
	}
	if (offered[0].status !== 'active') {
		throw new Error('Önerdiğin uygulama şu an aktif değil.');
	}

	// 2) Hedef app baska bir kullanicininki olmali.
	const target = await db
		.select({ id: apps.id, userId: apps.userId, status: apps.status, name: apps.name })
		.from(apps)
		.where(eq(apps.id, targetAppId))
		.limit(1);
	if (target.length === 0) throw new Error('Hedef uygulama bulunamadı.');
	if (target[0].userId === requesterId) {
		throw new Error('Kendi uygulamana trade isteği gönderemezsin.');
	}
	if (target[0].status !== 'active') {
		throw new Error('Hedef uygulama şu an aktif değil.');
	}
	const ownerId = target[0].userId;

	// 3) Karsi taraf ayni cifti acti mi? (ters yon).
	const reverse = await db
		.select()
		.from(trades)
		.where(
			and(
				eq(trades.requesterId, ownerId),
				eq(trades.targetAppId, offeredAppId), // B benim app'imi (offered) hedeflemis
				eq(trades.offeredAppId, targetAppId), // B kendi app'ini (target) onermis
				eq(trades.status, 'requested')
			)
		)
		.limit(1);

	if (reverse.length > 0) {
		// MATCH: hem ben hem karsi taraf birbirine commitment olusturuyor.
		let ids: { requesterCommitmentId: string; ownerCommitmentId: string };
		try {
			ids = await createTradeCommitments(requesterId, targetAppId, ownerId, offeredAppId);
		} catch (e) {
			// Birinin slot dolmus / zaten katilmis olabilir. Boyle bir durumda trade'i dustur.
			throw new Error(
				'Trade eslesirken bir sorun olustu: ' +
					(e as Error).message +
					' (Karsi taraf zaten uye veya slot doldu.)'
			);
		}

		// Bu yon (yeni gelen) bir kayit acalim sonra ikisini de 'matched' yapalim.
		const inserted = await db
			.insert(trades)
			.values({
				requesterId,
				targetAppId,
				offeredAppId,
				status: 'matched',
				commitmentId: ids.requesterCommitmentId,
				matchedAt: new Date()
			})
			.returning({ id: trades.id });
		const tradeId = inserted[0].id;

		await db
			.update(trades)
			.set({
				status: 'matched',
				commitmentId: ids.ownerCommitmentId,
				matchedAt: new Date()
			})
			.where(eq(trades.id, reverse[0].id));

		// Her iki kullaniciya da 'trade_matched' bildir.
		await notifyTradeMatched(requesterId, ownerId, target[0].name, offered[0].name);

		return { tradeId, matched: true };
	}

	// MATCH yok: sadece istek olustur ve karsi tarafa bildir.
	const inserted = await db
		.insert(trades)
		.values({ requesterId, targetAppId, offeredAppId, status: 'requested' })
		.returning({ id: trades.id });
	const tradeId = inserted[0].id;

	await notifyTradeRequested(requesterId, ownerId, target[0].name, offered[0].name);

	return { tradeId, matched: false };
}

/** Kullanicinin acmis oldugu istegi iptal eder. */
export async function cancelTradeRequest(userId: string, tradeId: string): Promise<void> {
	const rows = await db.select().from(trades).where(eq(trades.id, tradeId)).limit(1);
	if (rows.length === 0) throw new Error('Trade isteği bulunamadı.');
	const t = rows[0];
	if (t.requesterId !== userId) throw new Error('Yetkin yok.');
	if (t.status !== 'requested') throw new Error('Bu trade isteği artik değiştirilemez.');
	await db.update(trades).set({ status: 'cancelled' }).where(eq(trades.id, tradeId));
}

async function notifyTradeRequested(
	requesterId: string,
	ownerId: string,
	targetAppName: string,
	offeredAppName: string
): Promise<void> {
	const [reqRow, ownerRow] = await Promise.all([
		db
			.select({ firstName: users.firstName })
			.from(users)
			.where(eq(users.id, requesterId))
			.limit(1),
		db
			.select({
				telegramId: users.telegramId,
				locale: users.locale,
				botStarted: users.botStarted
			})
			.from(users)
			.where(eq(users.id, ownerId))
			.limit(1)
	]);
	if (ownerRow.length === 0 || !ownerRow[0].botStarted) return;
	await sendTemplate(ownerRow[0].telegramId, 'trade_requested', ownerRow[0].locale, {
		ad: reqRow[0]?.firstName ?? 'Birisi',
		app: targetAppName,
		teklif: offeredAppName
	});
}

async function notifyTradeMatched(
	requesterId: string,
	ownerId: string,
	targetAppName: string, // requester bunu test edecek
	offeredAppName: string // owner bunu test edecek
): Promise<void> {
	const [reqRow, ownerRow] = await Promise.all([
		db
			.select({
				telegramId: users.telegramId,
				firstName: users.firstName,
				locale: users.locale,
				botStarted: users.botStarted
			})
			.from(users)
			.where(eq(users.id, requesterId))
			.limit(1),
		db
			.select({
				telegramId: users.telegramId,
				firstName: users.firstName,
				locale: users.locale,
				botStarted: users.botStarted
			})
			.from(users)
			.where(eq(users.id, ownerId))
			.limit(1)
	]);
	const reqU = reqRow[0];
	const ownerU = ownerRow[0];
	if (reqU?.botStarted) {
		await sendTemplate(reqU.telegramId, 'trade_matched', reqU.locale, {
			ad: ownerU?.firstName ?? '?',
			app: targetAppName // requester test edecegi app
		});
	}
	if (ownerU?.botStarted) {
		await sendTemplate(ownerU.telegramId, 'trade_matched', ownerU.locale, {
			ad: reqU?.firstName ?? '?',
			app: offeredAppName // owner test edecegi app
		});
	}
}
