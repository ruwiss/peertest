import { env } from '$env/dynamic/private';
import { getRenderedTemplate, type Locale, type TemplateKey } from './templates';

// ============================================================
// TELEGRAM BILDIRIMLERI (Bot API sendMessage)
// On kosul: kullanici botu /start ile baglamis olmali (bot_started=true).
// Baglamamis kullanicilara DM atlanir (cagiran taraf in-app fallback gosterir).
// ============================================================

const TELEGRAM_API = 'https://api.telegram.org';

/** Dusuk seviye: ham metni Telegram DM olarak gonderir. Basari/basarisizlik doner. */
export async function sendTelegramMessage(telegramId: number, text: string): Promise<boolean> {
	const token = env.TELEGRAM_BOT_TOKEN;
	if (!token) {
		console.warn('[notify] TELEGRAM_BOT_TOKEN yok; mesaj gonderilemedi.');
		return false;
	}
	try {
		const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: telegramId,
				text,
				parse_mode: 'HTML',
				disable_web_page_preview: true
			})
		});
		if (!res.ok) {
			const body = await res.text();
			console.warn(`[notify] sendMessage basarisiz (${res.status}): ${body}`);
			return false;
		}
		return true;
	} catch (err) {
		console.warn('[notify] sendMessage hata:', err);
		return false;
	}
}

/** Sablon tabanli gonderim: key + locale + placeholder degiskenleri. */
export async function sendTemplate(
	telegramId: number,
	key: TemplateKey,
	locale: Locale,
	vars: Record<string, string | number> = {}
): Promise<boolean> {
	const text = await getRenderedTemplate(key, locale, vars);
	return sendTelegramMessage(telegramId, text);
}

/**
 * Inline-button (URL tipi) ile DM: kullaniciya bir buton goster, basinca harici URL acsin.
 * Bot deep-link login akisi icin: complete URL'ini butona bagliyoruz.
 */
export async function sendTelegramMessageWithButton(
	telegramId: number,
	text: string,
	buttonLabel: string,
	buttonUrl: string
): Promise<boolean> {
	const token = env.TELEGRAM_BOT_TOKEN;
	if (!token) {
		console.warn('[notify] TELEGRAM_BOT_TOKEN yok; mesaj gonderilemedi.');
		return false;
	}
	try {
		const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: telegramId,
				text,
				parse_mode: 'HTML',
				disable_web_page_preview: true,
				reply_markup: {
					inline_keyboard: [[{ text: buttonLabel, url: buttonUrl }]]
				}
			})
		});
		if (!res.ok) {
			const body = await res.text();
			console.warn(`[notify] sendMessage (button) basarisiz (${res.status}): ${body}`);
			return false;
		}
		return true;
	} catch (err) {
		console.warn('[notify] sendMessage (button) hata:', err);
		return false;
	}
}
