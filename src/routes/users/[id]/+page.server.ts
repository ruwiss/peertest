import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPublicProfile } from '$lib/server/users';

export const load: PageServerLoad = async ({ params }) => {
	const profile = await getPublicProfile(params.id);
	if (!profile) throw error(404, 'Kullanıcı bulunamadı.');
	return { profile };
};
