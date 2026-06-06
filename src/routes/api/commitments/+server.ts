import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { joinAppFree, listMyCommitments } from '$lib/server/commitment';
import { createTradeRequest } from '$lib/server/trade';
import { clientIp, consume, LIMITS } from '$lib/server/ratelimit';

// POST: "Katil" - 2 mod:
//   1) mode='free'         -> dogrudan taahhut + 3 checkpoint olustur (karsiliksiz)
//   2) mode='reciprocal'   -> trade istegi ac (offeredAppId zorunlu). Karsi taraf ayni
//                             cifti acmissa MATCH; iki taahhut da olusur.
// Rate limit: kotuye kullanim icin dakikada ~6 katilim/teklif denemesi.
export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	if (!locals.user) error(401, 'Giriş gerekli.');
	if (!locals.user.botStarted) error(403, 'Önce Telegram botunu bağla.');

	const ip = clientIp(request, getClientAddress);
	const rl = consume(`join:${locals.user.id}:${ip}`, LIMITS.commitmentJoin);
	if (!rl.ok) {
		return new Response(
			JSON.stringify({ message: `Çok hızlı deneme yaptın, ${rl.retryAfter} sn sonra tekrar dene.` }),
			{
				status: 429,
				headers: { 'content-type': 'application/json', 'retry-after': String(rl.retryAfter) }
			}
		);
	}

	const body = (await request.json().catch(() => ({}))) as {
		appId?: string;
		mode?: 'free' | 'reciprocal';
		offeredAppId?: string;
	};
	if (!body.appId) error(400, 'appId gerekli.');
	const mode = body.mode === 'reciprocal' ? 'reciprocal' : 'free';

	try {
		if (mode === 'reciprocal') {
			if (!body.offeredAppId) error(400, 'Karşılıklı modda offeredAppId gerekli.');
			const r = await createTradeRequest(locals.user.id, body.appId, body.offeredAppId);
			return json({ trade: r }, { status: 201 });
		}
		const id = await joinAppFree(locals.user.id, body.appId);
		return json({ id }, { status: 201 });
	} catch (e) {
		error(400, (e as Error).message);
	}
};

// GET: kullanicinin taahhutleri.
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Giriş gerekli.');
	return json(await listMyCommitments(locals.user.id));
};
