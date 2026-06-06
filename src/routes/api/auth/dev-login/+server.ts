import { dev } from '$app/environment';
import { redirect, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { createSession, generateSessionToken, setSessionCookie } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { safeRedirectPath } from '$lib/server/security';

// SADECE YEREL GELISTIRME: Telegram widget'i public domain istedigi icin yerelde
// giris yapmayi kolaylastirir. dev + DEV_LOGIN=true disinda 404 doner (prod'a sizmaz).
// Kullanim: /api/auth/dev-login?id=1001&name=Ali  (admin icin id'yi ADMIN_TELEGRAM_IDS'e ekle)
export const GET: RequestHandler = async (event) => {
	if (!dev || env.DEV_LOGIN !== 'true') error(404, 'Bulunamadı');

	const idRaw = event.url.searchParams.get('id');
	const idNum = idRaw ? Number(idRaw) : NaN;
	const id = Number.isFinite(idNum) && idNum > 0 ? idNum : 999000001;
	const name = event.url.searchParams.get('name') ?? `Dev${id}`;
	const username = event.url.searchParams.get('username') ?? `dev_${id}`;
	const redirectTo = safeRedirectPath(event.url.searchParams.get('redirectTo'), '/');

	const adminIds = (env.ADMIN_TELEGRAM_IDS ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	const admin = adminIds.includes(String(id));

	const existing = await db.select().from(users).where(eq(users.telegramId, id)).limit(1);
	let userId: string;
	if (existing.length > 0) {
		userId = existing[0].id;
		await db
			.update(users)
			.set({
				firstName: name,
				username,
				lastLoginAt: new Date(),
				...(admin ? { role: 'admin' as const } : {})
			})
			.where(eq(users.id, userId));
	} else {
		const inserted = await db
			.insert(users)
			.values({ telegramId: id, firstName: name, username, role: admin ? 'admin' : 'user' })
			.returning({ id: users.id });
		userId = inserted[0].id;
	}

	const token = generateSessionToken();
	const session = await createSession(token, userId);
	setSessionCookie(event, token, session.expiresAt);
	redirect(302, redirectTo);
};
