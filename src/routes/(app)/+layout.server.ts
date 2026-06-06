import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Giris gerektiren sayfalar: user yoksa /login'e (geri donus adresiyle) yonlendir.
// Not: Bot deep-link login zorunlu oldugu icin botStarted zaten her zaman true olacak;
// ayrica kontrol etmeye gerek yok.
export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
	}
};
