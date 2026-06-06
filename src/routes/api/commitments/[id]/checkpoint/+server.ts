import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { submitCheckpoint } from '$lib/server/commitment';

// PATCH: acik checkpoint'e SS kaniti yukle -> submitted.
export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Giriş gerekli.');
	if (!locals.user.botStarted) error(403, 'Önce Telegram botunu bağla.');
	const body = (await request.json().catch(() => ({}))) as {
		checkpointId?: string;
		screenshots?: { url: string; shareUrl: string }[];
	};
	if (!body.checkpointId || !body.screenshots?.length) {
		error(400, 'checkpointId ve screenshots gerekli.');
	}
	try {
		const result = await submitCheckpoint(locals.user.id, body.checkpointId, body.screenshots);
		return json({ ok: true, ...result });
	} catch (e) {
		error(400, (e as Error).message);
	}
};
