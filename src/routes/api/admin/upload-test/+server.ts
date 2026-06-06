import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { testUpload } from '$lib/server/upload';
import { getSetting, type UploadSetting } from '$lib/server/config';
import { clientIp, consume, LIMITS } from '$lib/server/ratelimit';

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	if (!locals.user || locals.user.role !== 'admin') throw error(403, 'Forbidden');
	const ip = clientIp(request, getClientAddress);
	const rl = consume(`admin:upload-test:${locals.user.id}:${ip}`, LIMITS.adminAction);
	if (!rl.ok) throw error(429, `Çok hızlı, ${rl.retryAfter} sn sonra tekrar dene.`);
	let cfg: UploadSetting;
	try {
		const body = (await request.json().catch(() => null)) as Partial<UploadSetting> | null;
		// Kullanici partial gondermisse mevcut ayarla birlestir.
		const current = await getSetting('upload');
		cfg = { ...current, ...(body ?? {}) } as UploadSetting;
	} catch (e) {
		throw error(400, (e as Error).message);
	}

	try {
		const out = await testUpload(cfg);
		return json({ ok: true, ...out });
	} catch (e) {
		return json({ ok: false, message: (e as Error).message }, { status: 400 });
	}
};
