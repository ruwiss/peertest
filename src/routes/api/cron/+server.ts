import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { runCron } from '$lib/server/cron';
import { safeEqual } from '$lib/server/security';

// Vercel Cron buraya GET atar. CRON_SECRET varsa Authorization: Bearer <secret> beklenir.
// Karsilastirma sabit zamanli (timing attack koruyucu).
export const GET: RequestHandler = async ({ request }) => {
	const auth = request.headers.get('authorization');
	if (env.CRON_SECRET && !safeEqual(auth, `Bearer ${env.CRON_SECRET}`)) {
		error(401, 'Yetkisiz.');
	}
	const result = await runCron();
	return json({ ok: true, ...result });
};
