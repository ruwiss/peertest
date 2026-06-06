import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from './db';
import { apps, checkpoints, commitments, reports, users } from './db/schema';
import { applyScore } from './score';

// ============================================================
// SIKAYET (REPORT) MANTIGI
// ============================================================

/** App sahibi, kendi uygulamasindaki bir tester'i sikayet eder (commitment uzerinden). */
export async function createReport(
	reporterId: string,
	commitmentId: string,
	reason: string
): Promise<string> {
	if (!reason?.trim()) throw new Error('Şikayet nedeni gerekli.');

	const rows = await db
		.select({ commitment: commitments, app: apps })
		.from(commitments)
		.innerJoin(apps, eq(commitments.appId, apps.id))
		.where(eq(commitments.id, commitmentId))
		.limit(1);
	if (rows.length === 0) throw new Error('Taahhüt bulunamadı.');

	const { commitment, app } = rows[0];
	if (app.userId !== reporterId)
		throw new Error('Yalnızca kendi uygulamandaki testerı şikayet edebilirsin.');
	if (commitment.testerId === reporterId) throw new Error('Kendini şikayet edemezsin.');

	const inserted = await db
		.insert(reports)
		.values({
			reporterId,
			reportedId: commitment.testerId,
			commitmentId,
			reason: reason.trim()
		})
		.returning({ id: reports.id });
	return inserted[0].id;
}

export interface ReportView {
	id: string;
	reason: string;
	status: 'open' | 'resolved' | 'dismissed';
	createdAt: Date;
	adminNote: string | null;
	commitmentId: string | null;
	reporter: { id: string; firstName: string; username: string | null };
	reported: { id: string; firstName: string; username: string | null; score: number };
	screenshots: { url: string; shareUrl: string }[];
}

/** Raporlari (varsayilan: acik) taraf bilgileri + kanit ekran goruntuleriyle listeler. */
export async function listReports(
	status: 'open' | 'resolved' | 'dismissed' = 'open'
): Promise<ReportView[]> {
	const rows = await db
		.select({
			id: reports.id,
			reason: reports.reason,
			status: reports.status,
			createdAt: reports.createdAt,
			adminNote: reports.adminNote,
			commitmentId: reports.commitmentId,
			reporterId: reports.reporterId,
			reportedId: reports.reportedId
		})
		.from(reports)
		.where(eq(reports.status, status))
		.orderBy(desc(reports.createdAt));
	if (rows.length === 0) return [];

	// Taraflar.
	const userIds = [...new Set(rows.flatMap((r) => [r.reporterId, r.reportedId]))];
	const us = await db
		.select({
			id: users.id,
			firstName: users.firstName,
			username: users.username,
			score: users.score
		})
		.from(users)
		.where(inArray(users.id, userIds));
	const userMap = new Map(us.map((u) => [u.id, u]));

	// Ilgili commitment'larin checkpoint ekran goruntuleri.
	const commitmentIds = rows.map((r) => r.commitmentId).filter((x): x is string => !!x);
	const cps = commitmentIds.length
		? await db
				.select({ commitmentId: checkpoints.commitmentId, screenshots: checkpoints.screenshots })
				.from(checkpoints)
				.where(inArray(checkpoints.commitmentId, commitmentIds))
		: [];
	const shotMap = new Map<string, { url: string; shareUrl: string }[]>();
	for (const cp of cps) {
		if (!cp.screenshots) continue;
		const list = shotMap.get(cp.commitmentId) ?? [];
		list.push(...cp.screenshots);
		shotMap.set(cp.commitmentId, list);
	}

	return rows.map((r) => {
		const rep = userMap.get(r.reporterId);
		const red = userMap.get(r.reportedId);
		return {
			id: r.id,
			reason: r.reason,
			status: r.status,
			createdAt: r.createdAt,
			adminNote: r.adminNote,
			commitmentId: r.commitmentId,
			reporter: {
				id: r.reporterId,
				firstName: rep?.firstName ?? '?',
				username: rep?.username ?? null
			},
			reported: {
				id: r.reportedId,
				firstName: red?.firstName ?? '?',
				username: red?.username ?? null,
				score: red?.score ?? 0
			},
			screenshots: r.commitmentId ? (shotMap.get(r.commitmentId) ?? []) : []
		};
	});
}

/** Admin karari: dismiss (kapat) veya penalize (puan dusur + opsiyonel commitment'i failed yap). */
export async function resolveReport(
	adminId: string,
	reportId: string,
	decision: 'dismiss' | 'penalize',
	opts: { penalty?: number; failCommitment?: boolean; note?: string } = {}
): Promise<void> {
	const rows = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
	if (rows.length === 0) throw new Error('Şikayet bulunamadı.');
	const report = rows[0];
	if (report.status !== 'open') throw new Error('Bu şikayet zaten karara bağlanmış.');

	if (decision === 'penalize') {
		const penalty = Math.abs(opts.penalty ?? 20);
		await applyScore({
			userId: report.reportedId,
			delta: -penalty,
			reason: 'report_penalty',
			commitmentId: report.commitmentId,
			actorId: adminId,
			note: opts.note ?? null
		});
		if (opts.failCommitment && report.commitmentId) {
			await db
				.update(commitments)
				.set({ status: 'failed' })
				.where(and(eq(commitments.id, report.commitmentId), eq(commitments.status, 'active')));
		}
	}

	await db
		.update(reports)
		.set({
			status: decision === 'penalize' ? 'resolved' : 'dismissed',
			adminNote: opts.note ?? null
		})
		.where(eq(reports.id, reportId));
}
