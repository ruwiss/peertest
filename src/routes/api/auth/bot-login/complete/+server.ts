import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { consumeLoginToken } from '$lib/server/botLogin';
import { createSession, generateSessionToken, setSessionCookie } from '$lib/server/auth';
import { clientIp, consume, LIMITS } from '$lib/server/ratelimit';

// GET: bot mesajindaki butona basinca buraya gelinir. Token'i tuketir, session olusturur.
export const GET: RequestHandler = async (event) => {
	const ip = clientIp(event.request, event.getClientAddress);
	const rl = consume(`bot-login-complete:${ip}`, LIMITS.authCallback);
	if (!rl.ok) error(429, `Çok fazla deneme. ${rl.retryAfter} saniye sonra tekrar dene.`);

	const token = event.url.searchParams.get('token');
	if (!token) error(400, 'Token gerekli.');

	const result = await consumeLoginToken(token);
	if (!result.ok) {
		const messages: Record<typeof result.reason, string> = {
			not_found: 'Giriş bağlantısı geçersiz.',
			expired: 'Giriş bağlantısının süresi doldu. Lütfen tekrar başlat.',
			already_used: 'Bu giriş bağlantısı zaten kullanılmış.',
			not_claimed: "Bağlantı henüz onaylanmamış. Telegram'da Start butonuna bas."
		};
		error(400, messages[result.reason]);
	}

	const sessionToken = generateSessionToken();
	const session = await createSession(sessionToken, result.user.id);
	setSessionCookie(event, sessionToken, session.expiresAt);

	redirect(302, result.redirectTo);
};
