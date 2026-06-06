import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import type { RequestHandler } from './$types';
import { createLoginToken, LOGIN_TOKEN_PREFIX } from '$lib/server/botLogin';
import { clientIp, consume, LIMITS } from '$lib/server/ratelimit';

// POST: yeni bir login token uretir, deep-link doner.
// Rate limit: dakikada ~6 token denemesi (authCallback ile ayni).
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const ip = clientIp(request, getClientAddress);
	const rl = consume(`bot-login-start:${ip}`, LIMITS.authCallback);
	if (!rl.ok) error(429, `Çok fazla deneme. ${rl.retryAfter} saniye sonra tekrar dene.`);

	const botUsername = env.PUBLIC_TELEGRAM_BOT_USERNAME ?? '';
	if (!botUsername) error(500, 'PUBLIC_TELEGRAM_BOT_USERNAME ayarlanmamis.');

	let body: { redirectTo?: string } = {};
	try {
		body = await request.json();
	} catch {
		// gov sessiz - bos govde de OK.
	}

	const token = await createLoginToken(body.redirectTo ?? null);
	const deepLink = `https://t.me/${botUsername}?start=${LOGIN_TOKEN_PREFIX}${token}`;
	return json({ token, deepLink });
};
