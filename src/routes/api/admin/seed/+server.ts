import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { seedDefaults } from '$lib/server/seed';

// Admin: varsayilan ayarlari/sablonlari DB'ye yukler (idempotent).
export const POST: RequestHandler = async ({ locals }) => {
	if (locals.user?.role !== 'admin') error(403, 'Yetkiniz yok.');
	const result = await seedDefaults();
	return json({ ok: true, inserted: result });
};
