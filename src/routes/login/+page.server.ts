import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env as pubEnv } from '$env/dynamic/public';
import { env as privEnv } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) redirect(302, '/');
	// Yerel gelistirme + DEV_LOGIN bayragi ikisi de acikken login sayfasinda hizli
	// test girisi formu gosterelim. Production'a sizmasini engellemek icin iki kosul.
	const devLoginEnabled = dev && privEnv.DEV_LOGIN === 'true';
	return {
		botUsername: pubEnv.PUBLIC_TELEGRAM_BOT_USERNAME ?? '',
		redirectTo: url.searchParams.get('redirectTo') ?? '/',
		devLoginEnabled
	};
};
