import { env } from '$env/dynamic/public';
import { createBotStartToken } from '$lib/server/bot';
import { safeRedirectPath } from '$lib/server/security';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user!; // (app) guard non-null garantisi
	const botUsername = env.PUBLIC_TELEGRAM_BOT_USERNAME ?? '';

	let deepLink = '';
	if (!user.botStarted && botUsername) {
		const token = await createBotStartToken(user.id);
		deepLink = `https://t.me/${botUsername}?start=${token}`;
	}

	const redirectTo = safeRedirectPath(url.searchParams.get('redirectTo'), '/');

	return { botStarted: user.botStarted, botUsername, deepLink, redirectTo };
};
