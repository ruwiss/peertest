import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserDetail } from '$lib/server/admin';
import { broadcastCustom } from '$lib/server/broadcast';

// Admin duyurusu botu baglamis TUM kullanicilara batch'ler halinde gonderilir;
// serverless'ta waitUntil olmadigi icin await edilir -> fonksiyon suresini yukselt.
export const config = { maxDuration: 60 };

export const load: PageServerLoad = async ({ params }) => {
	const detail = await getUserDetail(params.id);
	if (!detail) throw error(404, 'Kullanıcı bulunamadı.');
	return { detail };
};

export const actions: Actions = {
	// Admin: elle yazilan tr/en metni botu baglamis TUM kullanicilara, kendi
	// dillerinde DM olarak gonderir (genel duyuru). Belirli bir kullaniciya degil.
	broadcast: async ({ request }) => {
		const fd = await request.formData();
		const tr = String(fd.get('bodyTr') ?? '').trim();
		const en = String(fd.get('bodyEn') ?? '').trim();
		if (!tr || !en) return fail(400, { message: 'Türkçe ve İngilizce metni doldur.' });
		try {
			const res = await broadcastCustom({ tr, en });
			return { success: true as const, broadcast: res };
		} catch (e) {
			return fail(400, { message: (e as Error).message });
		}
	}
};
