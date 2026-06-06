import { and, count, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { db } from './db';
import { apps, checkpoints, commitments, trades } from './db/schema';

// ============================================================
// BILDIRIM (NOTIFICATION) SAYACI - navbar rozeti icin
// ============================================================
// Iki yonlu sayim:
//   1) Karsi taraftan sana ACIK trade istegi (status='requested', target = senin app'in)
//   2) Aktif taahhutunde su an penceresi acik + henuz kanit gondermemis checkpoint
// Toplam = trades + openCheckpoints

export interface NotifSummary {
	trades: number;
	openCheckpoints: number;
	total: number;
}

export async function getNotificationSummary(userId: string): Promise<NotifSummary> {
	const [tradeRow, cpRow] = await Promise.all([
		// 1) Bana yonelik bekleyen trade istekleri sayisi
		countIncomingTrades(userId),
		// 2) Penceresi acik bekleyen checkpoint'lerim
		countOpenCheckpoints(userId)
	]);
	return {
		trades: tradeRow,
		openCheckpoints: cpRow,
		total: tradeRow + cpRow
	};
}

async function countIncomingTrades(userId: string): Promise<number> {
	const myAppIds = (await db.select({ id: apps.id }).from(apps).where(eq(apps.userId, userId))).map(
		(r) => r.id
	);
	if (myAppIds.length === 0) return 0;
	const rows = await db
		.select({ c: count() })
		.from(trades)
		.where(and(inArray(trades.targetAppId, myAppIds), eq(trades.status, 'requested')));
	return Number(rows[0]?.c ?? 0);
}

async function countOpenCheckpoints(userId: string): Promise<number> {
	const now = new Date();
	// Subquery yerine join: tester=ben + commitment aktif + cp pending + pencere icinde
	const rows = await db
		.select({ c: count() })
		.from(checkpoints)
		.innerJoin(commitments, eq(checkpoints.commitmentId, commitments.id))
		.where(
			and(
				eq(commitments.testerId, userId),
				eq(commitments.status, 'active'),
				eq(checkpoints.status, 'pending'),
				lte(checkpoints.windowStart, now),
				gte(checkpoints.windowEnd, now)
			)
		);
	return Number(rows[0]?.c ?? 0);
}

// Cron / faz4: penceresi gecmis pending'leri saymak icin yardim (su an kullanilmiyor).
export async function countMissedDueCheckpoints(userId: string): Promise<number> {
	const now = new Date();
	const rows = await db
		.select({ c: count() })
		.from(checkpoints)
		.innerJoin(commitments, eq(checkpoints.commitmentId, commitments.id))
		.where(
			and(
				eq(commitments.testerId, userId),
				eq(commitments.status, 'active'),
				eq(checkpoints.status, 'pending'),
				sql`${checkpoints.windowEnd} < ${now.toISOString()}`
			)
		);
	return Number(rows[0]?.c ?? 0);
}
