import { DEFAULT_SETTINGS, type SettingKey } from './config';
import { DEFAULT_TEMPLATES, type Locale, type TemplateKey } from './templates';
import { db } from './db';
import { messageTemplates, settings } from './db/schema';

// Settings + MessageTemplates varsayilanlarini DB'ye yukler.
// Idempotent: var olan kayitlari (admin duzenlemeleri) EZMEZ.
export async function seedDefaults(): Promise<{ settings: number; templates: number }> {
	let settingsCount = 0;
	let templatesCount = 0;

	for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
		const res = await db
			.insert(settings)
			.values({ key, value: DEFAULT_SETTINGS[key] })
			.onConflictDoNothing({ target: settings.key });
		settingsCount += res.rowCount ?? 0;
	}

	for (const key of Object.keys(DEFAULT_TEMPLATES) as TemplateKey[]) {
		for (const locale of ['tr', 'en'] as Locale[]) {
			const res = await db
				.insert(messageTemplates)
				.values({ key, locale, text: DEFAULT_TEMPLATES[key][locale] })
				.onConflictDoNothing({ target: [messageTemplates.key, messageTemplates.locale] });
			templatesCount += res.rowCount ?? 0;
		}
	}

	return { settings: settingsCount, templates: templatesCount };
}
