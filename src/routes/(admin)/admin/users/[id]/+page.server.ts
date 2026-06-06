import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserDetail } from '$lib/server/admin';

export const load: PageServerLoad = async ({ params }) => {
	const detail = await getUserDetail(params.id);
	if (!detail) throw error(404, 'Kullanıcı bulunamadı.');
	return { detail };
};
