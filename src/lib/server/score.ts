import { desc, eq, sql } from 'drizzle-orm';
import { db } from './db';
import { scoreEvents, users } from './db/schema';

export interface ScoreEventView {
	id: string;
	delta: number;
	reason:
		| 'checkpoint_missed'
		| 'commitment_completed'
		| 'admin_penalty'
		| 'admin_reward'
		| 'report_penalty';
	note: string | null;
	createdAt: Date;
}

/** Kullanicinin skor hareketleri (yeni->eski). */
export async function listScoreEvents(userId: string, limit = 20): Promise<ScoreEventView[]> {
	return db
		.select({
			id: scoreEvents.id,
			delta: scoreEvents.delta,
			reason: scoreEvents.reason,
			note: scoreEvents.note,
			createdAt: scoreEvents.createdAt
		})
		.from(scoreEvents)
		.where(eq(scoreEvents.userId, userId))
		.orderBy(desc(scoreEvents.createdAt))
		.limit(limit);
}

export type ScoreReason =
	| 'checkpoint_missed'
	| 'commitment_completed'
	| 'admin_penalty'
	| 'admin_reward'
	| 'report_penalty';

export interface ApplyScoreOpts {
	userId: string;
	delta: number;
	reason: ScoreReason;
	commitmentId?: string | null;
	actorId?: string | null;
	note?: string | null;
}

/** ScoreEvents'e log yazar ve Users.score onbellegini gunceller. */
export async function applyScore(opts: ApplyScoreOpts): Promise<void> {
	if (opts.delta === 0) return;
	await db.insert(scoreEvents).values({
		userId: opts.userId,
		delta: opts.delta,
		reason: opts.reason,
		commitmentId: opts.commitmentId ?? null,
		actorId: opts.actorId ?? null,
		note: opts.note ?? null
	});
	await db
		.update(users)
		.set({ score: sql`${users.score} + ${opts.delta}` })
		.where(eq(users.id, opts.userId));
}
