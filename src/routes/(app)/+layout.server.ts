import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Giris gerektiren sayfalar: user yoksa /login'e (geri donus adresiyle) yonlendir.
// Ek olarak: Telegram botu baglanmadan hicbir aksiyon alinamaz. Kullaniciyi /connect-bot'a
// surekli yonlendiririz - tek istisna /connect-bot sayfasinin kendisi (yoksa sonsuz dongu).
export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
	}
	if (!locals.user.botStarted && url.pathname !== '/connect-bot') {
		redirect(302, `/connect-bot?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
	}
};
