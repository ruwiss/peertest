import type { RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { sessions, users, type Session, type User } from './db/schema';

// ============================================================
// SESSION KATMANI (lucia degil - kendi implementasyonumuz)
// Web Crypto kullanir -> hem Node hem edge/serverless'ta calisir.
// ============================================================

export const SESSION_COOKIE = 'session';
const DAY_MS = 1000 * 60 * 60 * 24;
const SESSION_TTL_MS = DAY_MS * 30; // 30 gun
const SESSION_REFRESH_MS = DAY_MS * 15; // yarisi gecince uzat

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
	return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(input: string): Promise<string> {
	return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(input)));
}

/** Ham, gizli session token uretir (sadece cookie'de tutulur). */
export function generateSessionToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(24));
	return toHex(bytes.buffer);
}

/** Token'in hash'ini session id olarak kullanir; satiri DB'ye yazar. */
export async function createSession(token: string, userId: string): Promise<Session> {
	const id = await sha256Hex(token);
	const session: Session = {
		id,
		userId,
		expiresAt: new Date(Date.now() + SESSION_TTL_MS)
	};
	await db.insert(sessions).values(session);
	return session;
}

export type SessionValidationResult =
	| { session: Session; user: User }
	| { session: null; user: null };

/** Cookie'deki ham token'i dogrular; suresi gecmisse siler, yariyi gecmisse uzatir. */
export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
	const id = await sha256Hex(token);
	const rows = await db
		.select({ session: sessions, user: users })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, id));

	if (rows.length === 0) return { session: null, user: null };
	const { session, user } = rows[0];

	// Suresi gecmis -> sil.
	if (Date.now() >= session.expiresAt.getTime()) {
		await db.delete(sessions).where(eq(sessions.id, id));
		return { session: null, user: null };
	}

	// Yariyi gectiyse suresini uzat (kayan pencere).
	if (Date.now() >= session.expiresAt.getTime() - SESSION_REFRESH_MS) {
		session.expiresAt = new Date(Date.now() + SESSION_TTL_MS);
		await db.update(sessions).set({ expiresAt: session.expiresAt }).where(eq(sessions.id, id));
	}

	return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function invalidateUserSessions(userId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.userId, userId));
}

// --- Cookie yardimcilari ---
export function setSessionCookie(event: RequestEvent, token: string, expiresAt: Date): void {
	event.cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		secure: !import.meta.env.DEV,
		sameSite: 'lax',
		expires: expiresAt
	});
}

export function deleteSessionCookie(event: RequestEvent): void {
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
}
