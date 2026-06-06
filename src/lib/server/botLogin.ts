import { and, eq, isNull, lt, sql } from 'drizzle-orm';
// `and` atomik update'te WHERE birlesimi icin kullaniliyor (consumeLoginToken).
import { env } from '$env/dynamic/private';
import { db } from './db';
import { loginTokens, users, type User } from './db/schema';
import { safeRedirectPath } from './security';
import { sendTelegramMessageWithButton } from './notify';

// ============================================================
// TELEGRAM BOT DEEP-LINK LOGIN
// ============================================================
// Telegram Login Widget yerine tek-kullanimlik token akisi.
// /login -> token uretilir -> t.me/BOT?start=login_<token> -> kullanici Start basar
// -> bot webhook token'i kullaniciya bag lar -> bot inline-button mesaj atar
// -> kullanici butona basar -> session olusur

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 dakika - kisa tutuyoruz, kotuye kullanim kapsami daralir
export const LOGIN_TOKEN_PREFIX = 'login_';

function randomToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(24));
	return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Yeni bir login token uretir. redirectTo sayfasi login sonrasi gidilecek yer.
 * userId baslangicta null'dur; bot webhook'u eslesince doldurur.
 */
export async function createLoginToken(redirectTo: string | null): Promise<string> {
	const token = randomToken();
	const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
	await db.insert(loginTokens).values({
		token,
		userId: null,
		// safeRedirectPath /api endpoint'inde de bir kez daha calistirilir; defense-in-depth.
		redirectTo: redirectTo ? safeRedirectPath(redirectTo, '/') : null,
		expiresAt
	});
	return token;
}

/**
 * Bot webhook'u /start login_<token> aldiginda bunu cagirir.
 * Token'i bulur, Telegram user'i upsert eder (botStarted=true ATAR), token.userId set eder
 * ve kullaniciya inline-button mesaj atar.
 */
export async function claimLoginToken(opts: {
	token: string;
	telegramId: number;
	firstName: string;
	username: string | null;
}): Promise<boolean> {
	// Token gecerli mi?
	const rows = await db
		.select()
		.from(loginTokens)
		.where(eq(loginTokens.token, opts.token))
		.limit(1);
	if (rows.length === 0) return false;
	const tk = rows[0];
	if (tk.consumedAt) return false;
	if (tk.expiresAt.getTime() < Date.now()) return false;

	// Telegram user upsert.
	const adminIds = (env.ADMIN_TELEGRAM_IDS ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	const admin = adminIds.includes(String(opts.telegramId));

	const existing = await db
		.select()
		.from(users)
		.where(eq(users.telegramId, opts.telegramId))
		.limit(1);
	let user: User;
	if (existing.length > 0) {
		const [updated] = await db
			.update(users)
			.set({
				firstName: opts.firstName,
				username: opts.username,
				botStarted: true,
				botStartToken: null,
				lastLoginAt: new Date(),
				...(admin ? { role: 'admin' as const } : {})
			})
			.where(eq(users.id, existing[0].id))
			.returning();
		user = updated;
	} else {
		const [inserted] = await db
			.insert(users)
			.values({
				telegramId: opts.telegramId,
				firstName: opts.firstName,
				username: opts.username,
				botStarted: true,
				role: admin ? 'admin' : 'user'
			})
			.returning();
		user = inserted;
	}

	// Token'i kullaniciya bagla (henuz consume etme; complete'te yapacagiz).
	await db.update(loginTokens).set({ userId: user.id }).where(eq(loginTokens.token, opts.token));

	// Inline-button mesaji at: "Giris yap" butonu complete URL'ine baglar.
	const baseUrl =
		(env.PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'https://peertest.live';
	const completeUrl = `${baseUrl}/api/auth/bot-login/complete?token=${encodeURIComponent(opts.token)}`;
	const text =
		user.locale === 'en'
			? `Hi ${user.firstName}! Tap the button below to sign in to PeerTest. The link is one-time use and expires in 10 minutes.`
			: `Merhaba ${user.firstName}! PeerTest'e giriş yapmak için aşağıdaki butona dokun. Bağlantı tek kullanımlık ve 10 dakikada sona erer.`;
	const buttonLabel = user.locale === 'en' ? 'Sign in to PeerTest' : 'PeerTest oturumunu aç';

	await sendTelegramMessageWithButton(opts.telegramId, text, buttonLabel, completeUrl);
	return true;
}

export interface ConsumeResult {
	ok: true;
	user: User;
	redirectTo: string;
}
export interface ConsumeError {
	ok: false;
	reason: 'not_found' | 'expired' | 'not_claimed' | 'already_used';
}

/** Tarayici complete URL'ine geldiginde token'i tuketir; session yaratimi cagiranda. */
export async function consumeLoginToken(token: string): Promise<ConsumeResult | ConsumeError> {
	const rows = await db.select().from(loginTokens).where(eq(loginTokens.token, token)).limit(1);
	if (rows.length === 0) return { ok: false, reason: 'not_found' };
	const tk = rows[0];
	if (tk.consumedAt) return { ok: false, reason: 'already_used' };
	if (tk.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };
	if (!tk.userId) return { ok: false, reason: 'not_claimed' };

	// Atomik tuketme: WHERE consumed_at IS NULL kosulu, race'i engeller.
	const updated = await db
		.update(loginTokens)
		.set({ consumedAt: new Date() })
		.where(and(eq(loginTokens.token, token), isNull(loginTokens.consumedAt)))
		.returning({ token: loginTokens.token });
	if (updated.length === 0) return { ok: false, reason: 'already_used' };

	const userRow = await db.select().from(users).where(eq(users.id, tk.userId)).limit(1);
	if (userRow.length === 0) return { ok: false, reason: 'not_found' };

	return {
		ok: true,
		user: userRow[0],
		redirectTo: safeRedirectPath(tk.redirectTo, '/')
	};
}

/** Periyodik temizlik (cron icinde cagrilabilir). Suresi gecmis kayitlari siler. */
export async function cleanupExpiredTokens(): Promise<number> {
	const r = await db
		.delete(loginTokens)
		.where(lt(loginTokens.expiresAt, sql`now()`))
		.returning({ token: loginTokens.token });
	return r.length;
}
