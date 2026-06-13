import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { settings } from './db/schema';

// ============================================================
// SISTEM AYARLARI (Settings) - tum kritik parametrelerin tek kaynagi.
// Deger DB'de yoksa buradaki varsayilan kullanilir (uygulama seed olmadan da calisir).
// Admin panelden setSetting ile degistirilir; kisa cache + invalidasyon.
// ============================================================

export interface CheckpointWindow {
	start: number; // started_at'a gore +gun
	end: number; // started_at'a gore +gun
	toleranceHours?: number; // ek tolerans (completed icin)
}
export interface CheckpointWindowsSetting {
	joined: CheckpointWindow;
	active: CheckpointWindow;
	completed: CheckpointWindow;
}
export interface ScoreSetting {
	start: number;
	missPenalty: number;
	completeReward: number;
	dimBelow: number;
	hideBelow: number;
}
export interface LimitsSetting {
	defaultSlotsTotal: number;
	maxAppsBeforeFirstComplete: number;
	rejoinSameAppAfterCancel: boolean;
}
export interface UploadSetting {
	provider: 'prntscr' | 'imgbb' | 'imgur' | 'catbox' | 'freeimage' | 'zerox0' | 'vercel_blob';
	baseUrl: string;
	secretKey: string;
	userAgent: string;
	dpi: string;
	regex: { status: string; share: string; error: string; cdnImg: string };
}
export interface CronSetting {
	runHourUTC: number;
	reminderLeadHours: number;
}
export interface InstructionSet {
	joined: string;
	active: string;
	completed: string;
}
export interface DefaultInstructionsSetting {
	tr: InstructionSet;
	en: InstructionSet;
}

export interface SettingsMap {
	checkpoint_windows: CheckpointWindowsSetting;
	score: ScoreSetting;
	limits: LimitsSetting;
	upload: UploadSetting;
	cron: CronSetting;
	default_instructions: DefaultInstructionsSetting;
}
export type SettingKey = keyof SettingsMap;

export const DEFAULT_SETTINGS: SettingsMap = {
	checkpoint_windows: {
		joined: { start: 0, end: 2 },
		active: { start: 6, end: 9 },
		completed: { start: 13, end: 14, toleranceHours: 24 }
	},
	score: { start: 100, missPenalty: -20, completeReward: 5, dimBelow: 50, hideBelow: 0 },
	limits: { defaultSlotsTotal: 12, maxAppsBeforeFirstComplete: 1, rejoinSameAppAfterCancel: false },
	upload: {
		provider: 'prntscr',
		baseUrl: 'https://upload.prntscr.com',
		// Provider'a ozel gizli/API anahtari (env'den okunur). prntscr kullaniyorsan
		// 3. parti aractan elde ettigin secret key'i UPLOAD_SECRET_KEY ile gec.
		secretKey: env.UPLOAD_SECRET_KEY ?? '',
		userAgent:
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		dpi: '1.000000',
		regex: {
			status: '<status>(.*?)</status>',
			share: '<share>(.*?)</share>',
			error: '<error>(.*?)</error>',
			// prnt.sc paylasim sayfasindaki og:image meta'si gercek CDN url'ini verir (en kararli).
			cdnImg: 'property="og:image"[^>]*content="(.*?)"'
		}
	},
	cron: { runHourUTC: 6, reminderLeadHours: 24 },
	default_instructions: {
		tr: {
			joined:
				'Google Groups davet linkine katıl, uygulamayı indir ve ilk açılış ekranını ekran görüntüsü olarak yükle.',
			active:
				'Uygulamanın hâlâ kurulu ve çalışır durumda olduğunu gösteren bir ekran görüntüsü yükle.',
			completed: '14 gün boyunca test ettiğini gösteren son bir ekran görüntüsü yükle.'
		},
		en: {
			joined:
				'Join the Google Groups invite link, install the app, and upload a screenshot of the first launch.',
			active: 'Upload a screenshot showing the app is still installed and running.',
			completed: 'Upload a final screenshot proving you tested for 14 days.'
		}
	}
};

// --- Kisa sureli in-memory cache ---
const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { value: unknown; expires: number }>();

/** Bir ayar degerini doner (DB -> yoksa varsayilan). Kisa cache uygular. */
export async function getSetting<K extends SettingKey>(key: K): Promise<SettingsMap[K]> {
	const cached = cache.get(key);
	if (cached && cached.expires > Date.now()) {
		return cached.value as SettingsMap[K];
	}

	let value = DEFAULT_SETTINGS[key];
	try {
		const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
		if (rows.length > 0) value = rows[0].value as SettingsMap[K];
	} catch {
		// DB erisilemezse sessizce varsayilana dus.
	}

	cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
	return value;
}

/** Ayar degerini gunceller (admin) ve cache'i tazeler. */
export async function setSetting<K extends SettingKey>(
	key: K,
	value: SettingsMap[K],
	adminId?: string
): Promise<void> {
	await db
		.insert(settings)
		.values({ key, value, updatedBy: adminId ?? null, updatedAt: new Date() })
		.onConflictDoUpdate({
			target: settings.key,
			set: { value, updatedBy: adminId ?? null, updatedAt: new Date() }
		});
	cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

/** Cache'i tamamen temizler (test / manuel invalidasyon). */
export function clearSettingsCache(): void {
	cache.clear();
}
