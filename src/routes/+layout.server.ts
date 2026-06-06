import type { LayoutServerLoad } from './$types';
import { getNotificationSummary, type NotifSummary } from '$lib/server/notifications';

// Tum sayfalara giris yapan kullaniciyi (veya null) tasir; Header bunu kullanir.
// Login kullaniciya bildirim sayilari da gelir; Header rozeti gosterir.
export const load: LayoutServerLoad = async ({ locals }) => {
	let notif: NotifSummary = { trades: 0, openCheckpoints: 0, total: 0 };
	if (locals.user) {
		try {
			notif = await getNotificationSummary(locals.user.id);
		} catch (err) {
			console.warn('[layout] bildirim sayisi alinamadi:', err);
		}
	}
	return {
		user: locals.user
			? {
					id: locals.user.id,
					firstName: locals.user.firstName,
					username: locals.user.username,
					avatarUrl: locals.user.avatarUrl,
					score: locals.user.score,
					role: locals.user.role,
					botStarted: locals.user.botStarted,
					locale: locals.user.locale
				}
			: null,
		notif
	};
};
