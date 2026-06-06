import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { handleBotStart } from '$lib/server/bot';
import { claimLoginToken, LOGIN_TOKEN_PREFIX } from '$lib/server/botLogin';
import { safeEqual } from '$lib/server/security';
import { clientIp, consume, LIMITS } from '$lib/server/ratelimit';

interface TelegramUpdate {
	message?: {
		text?: string;
		from?: {
			id?: number;
			first_name?: string;
			username?: string;
		};
	};
}

// Telegram bot webhook. setWebhook secret_token ile bu header eslesmeli.
// Karsilastirma sabit zamanli (timing attack koruyucu).
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const secret = request.headers.get('x-telegram-bot-api-secret-token');
	if (env.TELEGRAM_WEBHOOK_SECRET && !safeEqual(secret, env.TELEGRAM_WEBHOOK_SECRET)) {
		return new Response('forbidden', { status: 403 });
	}
	// IP-based rate limit: secret bilinse bile flood'a karsi.
	const ip = clientIp(request, getClientAddress);
	const rl = consume(`tg:${ip}`, LIMITS.telegramWebhook);
	if (!rl.ok) {
		return new Response('rate-limited', {
			status: 429,
			headers: { 'retry-after': String(rl.retryAfter) }
		});
	}

	let update: TelegramUpdate;
	try {
		update = await request.json();
	} catch {
		return new Response('ok');
	}

	const textMsg = update.message?.text;
	const from = update.message?.from;
	const fromId = from?.id;
	if (textMsg && fromId && textMsg.startsWith('/start')) {
		const payload = textMsg.split(/\s+/)[1];
		if (payload && payload.startsWith(LOGIN_TOKEN_PREFIX)) {
			// Bot deep-link login akisi: token'i kullaniciya bagla + inline-button mesaji at.
			const loginToken = payload.slice(LOGIN_TOKEN_PREFIX.length);
			await claimLoginToken({
				token: loginToken,
				telegramId: fromId,
				firstName: from?.first_name ?? `User${fromId}`,
				username: from?.username ?? null
			});
		} else {
			// Eski akis: bot baglama token'i (varsa) veya yalin /start.
			await handleBotStart(payload, fromId);
		}
	}

	return new Response('ok');
};
