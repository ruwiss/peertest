import { eq } from 'drizzle-orm';
import { db } from './db';
import { users } from './db/schema';
import { sendTemplate } from './notify';

// ============================================================
// TELEGRAM BOT BAGLAMA
// Kullanici /start <token> ile bota yazinca bot_started=true yapilir.
// Boylece bot ona DM gonderebilir hale gelir.
// ============================================================

function randomToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Kullanici icin tek kullanimlik bot baglama token'i uretir ve saklar. */
export async function createBotStartToken(userId: string): Promise<string> {
	const token = randomToken();
	await db.update(users).set({ botStartToken: token }).where(eq(users.id, userId));
	return token;
}

/**
 * /start <token> isleme. Token'a sahip kullaniciyi bulur, bot_started=true yapar,
 * token'i temizler ve hosgeldin DM'i atar. Eslesme yoksa false doner.
 */
export async function handleBotStart(
	token: string | undefined,
	telegramId: number
): Promise<boolean> {
	// Once token ile eslestir; token yoksa telegram_id ile dene (kullanici zaten kayitliysa).
	let matched = token
		? await db.select().from(users).where(eq(users.botStartToken, token)).limit(1)
		: [];

	if (matched.length === 0) {
		matched = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
	}
	if (matched.length === 0) return false;

	const user = matched[0];
	await db
		.update(users)
		.set({ botStarted: true, botStartToken: null })
		.where(eq(users.id, user.id));

	await sendTemplate(telegramId, 'bot_link_welcome', user.locale, { ad: user.firstName });
	return true;
}
