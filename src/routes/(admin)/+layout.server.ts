import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Sadece admin rolu. Giris yoksa login'e, admin degilse 403.
// Bot bagli degilse de calistirilamaz - admin'in de bildirim almasi gerek.
export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}
	if (locals.user.role !== 'admin') {
		error(403, 'Bu alana erişim yetkiniz yok.');
	}
	if (!locals.user.botStarted) {
		redirect(302, `/connect-bot?redirectTo=${encodeURIComponent(url.pathname)}`);
	}
};
