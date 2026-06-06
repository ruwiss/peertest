// ============================================================
// IN-MEMORY TOKEN BUCKET RATE LIMITER
// Vercel serverless'ta her instance kendi map'ini tutar.
// Yatay olarak distribute uzerinde cold start veya cok-instance
// senaryolarinda saldirgan birden fazla bucket'a yayilabilir; ama
// yine de kaba kuvvet ve gurultulu spam icin etkili bir savunmadir.
// Onemli yerlerde edge WAF / kotali servisler ile takviye edilebilir.
// ============================================================

interface Bucket {
	tokens: number;
	lastRefill: number;
}

export interface LimitConfig {
	/** Max token (burst capacity). */
	capacity: number;
	/** Doluluk hizi: token / saniye. */
	refillRate: number;
}

const buckets = new Map<string, Bucket>();

// Stale girisleri tembel temizleme: her cagrida %1 ihtimalle tara.
function maybeCleanup(now: number): void {
	if (Math.random() > 0.01) return;
	const cutoff = now - 60 * 60 * 1000; // 1 saat
	for (const [k, b] of buckets) {
		if (b.lastRefill < cutoff) buckets.delete(k);
	}
}

/**
 * Verilen anahtar icin 1 token tuketmeye calisir.
 * Donus: { ok: true } veya { ok: false, retryAfter: saniye }.
 * key: "endpoint:identifier" gibi unique string (ip + path).
 */
export function consume(
	key: string,
	cfg: LimitConfig
): { ok: true } | { ok: false; retryAfter: number } {
	const now = Date.now();
	maybeCleanup(now);

	const b = buckets.get(key) ?? { tokens: cfg.capacity, lastRefill: now };

	// Token doldur (elapsed * rate). Capacity ile sinirla.
	const elapsedSec = (now - b.lastRefill) / 1000;
	b.tokens = Math.min(cfg.capacity, b.tokens + elapsedSec * cfg.refillRate);
	b.lastRefill = now;

	if (b.tokens < 1) {
		buckets.set(key, b);
		const need = 1 - b.tokens;
		const retryAfter = Math.max(1, Math.ceil(need / cfg.refillRate));
		return { ok: false, retryAfter };
	}

	b.tokens -= 1;
	buckets.set(key, b);
	return { ok: true };
}

/**
 * SvelteKit isteginden anlamli bir IP cikartir.
 * Vercel x-forwarded-for'un ilk degerini, sonra x-real-ip'i, sonra getClientAddress'i dener.
 * Bilinmiyorsa "unknown" doner (ayni anahtarla cogalir ama yine kotali olur).
 */
export function clientIp(request: Request, getClientAddress: () => string): string {
	const xff = request.headers.get('x-forwarded-for');
	if (xff) {
		const first = xff.split(',')[0]?.trim();
		if (first) return first;
	}
	const real = request.headers.get('x-real-ip');
	if (real) return real;
	try {
		return getClientAddress();
	} catch {
		return 'unknown';
	}
}

// Yaygin preset'ler. Endpoint'lerde import edip kullanmak icin.
export const LIMITS = {
	/** Upload: dakikada 10, burst 5. */
	upload: { capacity: 5, refillRate: 10 / 60 } satisfies LimitConfig,
	/** Commitment join: dakikada 6, burst 3 (insan hizinda). */
	commitmentJoin: { capacity: 3, refillRate: 6 / 60 } satisfies LimitConfig,
	/** Login callback: dakikada 6, burst 3 (kullanici hata yapip tekrar denedikce). */
	authCallback: { capacity: 3, refillRate: 6 / 60 } satisfies LimitConfig,
	/** Admin endpoint: bol bol, dakikada 30. */
	adminAction: { capacity: 10, refillRate: 30 / 60 } satisfies LimitConfig,
	/** Telegram webhook (cok hizli): saniyede 5. */
	telegramWebhook: { capacity: 10, refillRate: 5 } satisfies LimitConfig
};
