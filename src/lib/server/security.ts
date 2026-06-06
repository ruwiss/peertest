import { timingSafeEqual } from 'node:crypto';

// ============================================================
// PAYLASIMLI GUVENLIK YARDIMCILARI
// ============================================================

/**
 * Postgres ILIKE/LIKE deseni icin kullanici girisini escape eder.
 * `%`, `_`, `\` joker karakterlerini kacirir; kullanici "100%" yazarsa
 * "her seyi eslestirir" yerine literal "100%" arar.
 */
export function escapeLike(input: string): string {
	return input.replace(/[\\%_]/g, '\\$&');
}

/**
 * Sabit zamanli string karsilastirma. Sir karsilastirmalarinda
 * `===` timing attack'a aciktir; bu helper karakter-karakter erken
 * cikis yapmaz. Iki taraf farkli uzunluksa once length-equality.
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
	if (typeof a !== 'string' || typeof b !== 'string') return false;
	const ab = Buffer.from(a, 'utf8');
	const bb = Buffer.from(b, 'utf8');
	if (ab.length !== bb.length) {
		// timingSafeEqual length mismatch'te throw eder; buffer'lari esitle.
		const max = Math.max(ab.length, bb.length);
		const pa = Buffer.alloc(max);
		const pb = Buffer.alloc(max);
		ab.copy(pa);
		bb.copy(pb);
		// Esit olmadigini saklayarak yine de sabit zamanli compare yap.
		timingSafeEqual(pa, pb);
		return false;
	}
	return timingSafeEqual(ab, bb);
}

/**
 * redirectTo URL parametresinin acik yonlendirme (open redirect)
 * acigi olusturmadigindan emin olur. `/foo` izinli, `//evil.com` (protocol-relative)
 * ve `https://...` REDDEDILIR. Geri kalan her sey fallback'e duser.
 */
export function safeRedirectPath(redirectTo: string | null | undefined, fallback = '/'): string {
	if (!redirectTo) return fallback;
	if (!redirectTo.startsWith('/')) return fallback;
	if (redirectTo.startsWith('//')) return fallback; // protocol-relative
	if (redirectTo.startsWith('/\\')) return fallback; // bazi tarayicilar \ -> /
	return redirectTo;
}

/**
 * Yuklenen bytes'in basina bakar; gercekten goruntu mu?
 * PNG/JPEG/GIF/WEBP magic byte'larini tanir. Dosya adina degil iceriğe guvenir.
 */
export function isImageBytes(buf: ArrayBuffer): boolean {
	const b = new Uint8Array(buf);
	if (b.length < 12) return false;
	// PNG: 89 50 4E 47 0D 0A 1A 0A
	if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return true;
	// JPEG: FF D8 FF
	if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true;
	// GIF: 47 49 46 38
	if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return true;
	// WEBP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50
	if (
		b[0] === 0x52 &&
		b[1] === 0x49 &&
		b[2] === 0x46 &&
		b[3] === 0x46 &&
		b[8] === 0x57 &&
		b[9] === 0x45 &&
		b[10] === 0x42 &&
		b[11] === 0x50
	)
		return true;
	return false;
}
