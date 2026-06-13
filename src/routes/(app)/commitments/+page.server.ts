import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { listMyCommitments, type MyCommitment } from '$lib/server/commitment';
import {
	listMyTrades,
	listTradesTowardsMe,
	cancelTradeRequest,
	type TradeRequestRow
} from '$lib/server/trade';
import { getSetting } from '$lib/server/config';

export const load: PageServerLoad = async ({ locals }) => {
	let commitments: MyCommitment[] = [];
	let outgoingTrades: TradeRequestRow[] = [];
	let incomingTrades: TradeRequestRow[] = [];
	let dbReady = true;
	try {
		const [c, outT, inT] = await Promise.all([
			listMyCommitments(locals.user!.id),
			listMyTrades(locals.user!.id),
			listTradesTowardsMe(locals.user!.id)
		]);
		commitments = c;
		outgoingTrades = outT;
		incomingTrades = inT;
	} catch (err) {
		console.warn('[commitments] load hata:', err);
		dbReady = false;
	}
	const di = await getSetting('default_instructions');
	const locale = locals.user!.locale;
	return {
		commitments,
		outgoingTrades,
		incomingTrades,
		dbReady,
		defaultInstructions: di[locale] ?? di.tr,
		// Sunucu tarafi "simdi" - istemci hidrasyon sonrasi reaktif olarak gunceller.
		serverNow: new Date().toISOString()
	};
};

export const actions: Actions = {
	cancelTrade: async ({ request, locals }) => {
		const fd = await request.formData();
		const tradeId = String(fd.get('tradeId') ?? '');
		if (!tradeId) return fail(400, { message: 'tradeId gerekli.' });
		try {
			await cancelTradeRequest(locals.user!.id, tradeId);
		} catch (e) {
			return fail(400, { message: (e as Error).message });
		}
		return { success: true as const };
	}
};
