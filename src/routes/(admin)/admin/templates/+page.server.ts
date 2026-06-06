import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { messageTemplates } from '$lib/server/db/schema';
import { DEFAULT_TEMPLATES, type Locale, type TemplateKey } from '$lib/server/templates';

export const load: PageServerLoad = async () => {
	const rows = await db.select().from(messageTemplates);
	const map = new Map(rows.map((r) => [`${r.key}:${r.locale}`, r.text]));
	const keys = Object.keys(DEFAULT_TEMPLATES) as TemplateKey[];
	const items = keys.map((key) => ({
		key,
		tr: map.get(`${key}:tr`) ?? DEFAULT_TEMPLATES[key].tr,
		en: map.get(`${key}:en`) ?? DEFAULT_TEMPLATES[key].en
	}));
	return { items };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const fd = await request.formData();
		const key = String(fd.get('key'));
		const locale = String(fd.get('locale')) as Locale;
		const text = String(fd.get('text') ?? '');
		if (!(key in DEFAULT_TEMPLATES) || (locale !== 'tr' && locale !== 'en')) {
			return fail(400, { message: 'Gecersiz sablon.' });
		}
		try {
			await db
				.insert(messageTemplates)
				.values({ key, locale, text, updatedBy: locals.user!.id, updatedAt: new Date() })
				.onConflictDoUpdate({
					target: [messageTemplates.key, messageTemplates.locale],
					set: { text, updatedBy: locals.user!.id, updatedAt: new Date() }
				});
		} catch (e) {
			return fail(400, { message: (e as Error).message });
		}
		return { success: true };
	}
};
