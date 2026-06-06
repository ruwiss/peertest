import { and, count, eq, inArray } from 'drizzle-orm';
import { db } from './db';
import { apps, commitments, users } from './db/schema';

export interface PublicProfile {
	id: string;
	firstName: string;
	username: string | null;
	avatarUrl: string | null;
	score: number;
	completedCount: number;
	memberSince: Date;
	apps: Array<{
		id: string;
		name: string;
		packageName: string | null;
		iconUrl: string | null;
		status: 'active' | 'frozen' | 'closed';
	}>;
}

/** Listeden / kart ustunden erisilebilen herkese acik profil. Hassas bilgi yok. */
export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
	const u = await db.select().from(users).where(eq(users.id, userId)).limit(1);
	if (u.length === 0) return null;
	const user = u[0];

	const ownedApps = await db
		.select({
			id: apps.id,
			name: apps.name,
			packageName: apps.packageName,
			iconUrl: apps.iconUrl,
			status: apps.status
		})
		.from(apps)
		.where(and(eq(apps.userId, userId), inArray(apps.status, ['active', 'frozen'])));

	const cmt = await db
		.select({ c: count() })
		.from(commitments)
		.where(and(eq(commitments.testerId, userId), eq(commitments.status, 'completed')));

	return {
		id: user.id,
		firstName: user.firstName,
		username: user.username,
		avatarUrl: user.avatarUrl,
		score: user.score,
		completedCount: cmt[0]?.c ?? 0,
		memberSince: user.createdAt,
		apps: ownedApps
	};
}
