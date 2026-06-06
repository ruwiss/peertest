import { fail } from '@sveltejs/kit';
import { and, count, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { listScoreEvents, type ScoreEventView } from '$lib/server/score';
import { db } from '$lib/server/db';
import { commitments, users } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	let events: ScoreEventView[] = [];
	let completedCount = 0;
	let memberSince: Date | null = null;
	try {
		const [evts, completed, member] = await Promise.all([
			listScoreEvents(userId),
			db
				.select({ c: count() })
				.from(commitments)
				.where(and(eq(commitments.testerId, userId), eq(commitments.status, 'completed'))),
			db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, userId)).limit(1)
		]);
		events = evts;
		completedCount = Number(completed[0]?.c ?? 0);
		memberSince = member[0]?.createdAt ?? null;
	} catch (err) {
		console.warn('[account] yuklenemedi:', err);
	}
	return { events, completedCount, memberSince };
};

function isValidImageUrl(s: string): boolean {
	try {
		const u = new URL(s);
		return u.protocol === 'http:' || u.protocol === 'https:';
	} catch {
		return false;
	}
}

export const actions: Actions = {
	// Profil resmi guncelle. Bos string ile kaldirma da destekli.
	// URL'in kendisi /api/upload tarafindan uretildigi icin formattan emin olarak
	// http(s) URL saglik kontrolu yapariz; XSS endisesi yok (avatar <img> ile cikar).
	updateAvatar: async ({ request, locals }) => {
		const fd = await request.formData();
		const raw = String(fd.get('avatarUrl') ?? '').trim();

		if (raw && !isValidImageUrl(raw)) {
			return fail(400, { message: 'Geçerli bir görsel URL gerekli.' });
		}

		await db
			.update(users)
			.set({ avatarUrl: raw || null })
			.where(eq(users.id, locals.user!.id));
		return { success: true as const };
	}
};
