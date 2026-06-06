import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cancelCommitment } from '$lib/server/commitment';

// DELETE: tester gonullu birakir veya app sahibi tester'i cikarir (slot bosalir).
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Giriş gerekli.');
	if (!locals.user.botStarted) error(403, 'Önce Telegram botunu bağla.');
	try {
		await cancelCommitment(locals.user.id, params.id);
		return json({ ok: true });
	} catch (e) {
		error(400, (e as Error).message);
	}
};
