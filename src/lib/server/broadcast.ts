import { and, eq, ne } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { users } from './db/schema';
import { sendTelegramMessage } from './notify';
import { getRenderedTemplate, type Locale } from './templates';

// ============================================================
// TOPLU DUYURU (BROADCAST)
// Botu baglamis (DM atilabilir) kullanicilara, her birine KENDI DILINDE DM atar.
//   - broadcastNewApp: yeni uygulama ILK KEZ eklendiginde otomatik.
//   - broadcastCustom: admin'in elle yazdigi tr/en metni herkese gonderir.
//
// Telegram bot API farkli kullanicilara ~30 mesaj/sn'ye izin verir. Hepsini bir
// anda gondermek 429 (Too Many Requests) yer; bu yuzden BATCH_SIZE'lik gruplar
// halinde gonderir ve gruplar arasinda BATCH_DELAY_MS bekleriz.
//
// Not: Bu proje Vercel'de "serverless" (edge degil) calistigi icin platform
// `waitUntil` yok; cagiran taraf bu fonksiyonlari await etmeli. Bu yuzden cagiran
// route'larin maxDuration'i yukseltilmistir.
// ============================================================

const SITE_URL = 'https://peertest.live';

// 25 mesaj/grup + gruplar arasi 1sn => efektif ~25 msg/sn (limitin altinda).
const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface BroadcastResult {
	/** DM atilabilir (botStarted) alici sayisi. */
	total: number;
	/** Telegram'in kabul ettigi (basarili) gonderim sayisi. */
	sent: number;
}

interface Recipient {
	telegramId: number;
	locale: Locale;
}

/**
 * Alicilara dillerine gore (textByLocale[locale]) batch'ler halinde DM gonderir.
 * Rate limit icin gruplar arasi bekler. Basarili gonderim sayisini doner.
 */
async function dispatch(
	recipients: Recipient[],
	textByLocale: Record<Locale, string>
): Promise<number> {
	let sent = 0;
	for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
		const batch = recipients.slice(i, i + BATCH_SIZE);
		const results = await Promise.all(
			batch.map((u) => sendTelegramMessage(u.telegramId, textByLocale[u.locale]))
		);
		sent += results.filter(Boolean).length;
		// Son grup degilse rate limit icin kisa bir nefes al.
		if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_DELAY_MS);
	}
	return sent;
}

/**
 * Yeni eklenen uygulamayi tum (botu baglamis, sahip haric) kullanicilara duyurur.
 * Hata firlatmaz; cagiran taraf app olusturmayi bu yuzden iptal etmemeli.
 */
export async function broadcastNewApp(app: {
	id: string;
	name: string;
	ownerId: string;
}): Promise<BroadcastResult> {
	// Bot token yoksa (or. lokal gelistirme) hic ugrasma.
	if (!env.TELEGRAM_BOT_TOKEN) return { total: 0, sent: 0 };

	// Yalnizca botu /start ile baglamis (DM atilabilir) kullanicilar; sahip haric.
	const recipients = await db
		.select({ telegramId: users.telegramId, locale: users.locale })
		.from(users)
		.where(and(eq(users.botStarted, true), ne(users.id, app.ownerId)));

	if (recipients.length === 0) return { total: 0, sent: 0 };

	// Metni dil basina TEK kez render et (degiskenler tum alicilarda ayni).
	const vars = { app: app.name, link: `${SITE_URL}/apps/${app.id}` };
	const textByLocale: Record<Locale, string> = {
		tr: await getRenderedTemplate('app_published', 'tr', vars),
		en: await getRenderedTemplate('app_published', 'en', vars)
	};

	const sent = await dispatch(recipients, textByLocale);
	return { total: recipients.length, sent };
}

/**
 * Admin'in elle yazdigi serbest metni (tr + en) botu baglamis TUM kullanicilara
 * kendi dilinde gonderir. Metinler HTML (parse_mode=HTML) olarak iletilir.
 */
export async function broadcastCustom(text: { tr: string; en: string }): Promise<BroadcastResult> {
	if (!env.TELEGRAM_BOT_TOKEN) return { total: 0, sent: 0 };

	const recipients = await db
		.select({ telegramId: users.telegramId, locale: users.locale })
		.from(users)
		.where(eq(users.botStarted, true));

	if (recipients.length === 0) return { total: 0, sent: 0 };

	const textByLocale: Record<Locale, string> = { tr: text.tr, en: text.en };
	const sent = await dispatch(recipients, textByLocale);
	return { total: recipients.length, sent };
}
