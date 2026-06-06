// Tarih bicimleme ve geri sayim yardimcilari (istemci + sunucu).
import { getLocale } from '$lib/paraglide/runtime';

export function formatDate(d: Date | string, locale?: 'tr' | 'en'): string {
	const date = typeof d === 'string' ? new Date(d) : d;
	const loc = locale ?? (getLocale() as 'tr' | 'en');
	return new Intl.DateTimeFormat(loc === 'en' ? 'en-US' : 'tr-TR', {
		day: '2-digit',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}

/** Hedefe kalan sureyi kompakt metne cevirir (locale duyarli): "1d 4h", "1g 4s". */
export function countdownText(target: Date | string, now: Date = new Date()): string {
	const t = typeof target === 'string' ? new Date(target) : target;
	let ms = t.getTime() - now.getTime();
	const en = getLocale() === 'en';
	if (ms <= 0) return en ? 'expired' : 'doldu';
	const day = Math.floor(ms / 86_400_000);
	ms -= day * 86_400_000;
	const hour = Math.floor(ms / 3_600_000);
	ms -= hour * 3_600_000;
	const min = Math.floor(ms / 60_000);
	const [d, h, mn] = en ? ['d', 'h', 'm'] : ['g', 's', 'dk'];
	if (day > 0) return `${day}${d} ${hour}${h}`;
	if (hour > 0) return `${hour}${h} ${min}${mn}`;
	return `${min}${mn}`;
}

export function msUntil(target: Date | string, now: Date = new Date()): number {
	const t = typeof target === 'string' ? new Date(target) : target;
	return t.getTime() - now.getTime();
}
