import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	listUsers,
	listApps,
	adjustScore,
	shadowban,
	deleteUser,
	adminDeleteApp,
	listFrozenApps,
	manualUnfreeze
} from '$lib/server/admin';
import { listReports, resolveReport } from '$lib/server/report';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q') ?? '';
	const aq = url.searchParams.get('aq') ?? '';
	const rs = url.searchParams.get('rs') ?? 'open';
	const reportStatus = (['open', 'resolved', 'dismissed'] as const).includes(
		rs as 'open' | 'resolved' | 'dismissed'
	)
		? (rs as 'open' | 'resolved' | 'dismissed')
		: 'open';
	const [users, apps, reports, frozen] = await Promise.all([
		listUsers(q),
		listApps(aq),
		listReports(reportStatus),
		listFrozenApps()
	]);
	return { users, apps, reports, frozen, q, aq, reportStatus };
};

function ok() {
	return { success: true as const };
}
function err(e: unknown) {
	return fail(400, { message: (e as Error).message });
}

export const actions: Actions = {
	adjustScore: async ({ request, locals }) => {
		const fd = await request.formData();
		try {
			await adjustScore(
				locals.user!.id,
				String(fd.get('userId')),
				Number(fd.get('delta')),
				String(fd.get('note') ?? '') || undefined
			);
		} catch (e) {
			return err(e);
		}
		return ok();
	},

	shadowban: async ({ request, locals }) => {
		const fd = await request.formData();
		try {
			await shadowban(locals.user!.id, String(fd.get('userId')));
		} catch (e) {
			return err(e);
		}
		return ok();
	},

	deleteUser: async ({ request }) => {
		const fd = await request.formData();
		try {
			await deleteUser(String(fd.get('userId')));
		} catch (e) {
			return err(e);
		}
		return ok();
	},

	// Admin: bir uygulamayi tamamen siler. Opsiyonel sebep sahibe DM olarak gider.
	deleteApp: async ({ request }) => {
		const fd = await request.formData();
		try {
			await adminDeleteApp(String(fd.get('appId')), String(fd.get('reason') ?? '') || undefined);
		} catch (e) {
			return err(e);
		}
		return ok();
	},

	resolveReport: async ({ request, locals }) => {
		const fd = await request.formData();
		try {
			await resolveReport(
				locals.user!.id,
				String(fd.get('reportId')),
				fd.get('decision') === 'penalize' ? 'penalize' : 'dismiss',
				{
					penalty: fd.get('penalty') ? Number(fd.get('penalty')) : undefined,
					failCommitment: fd.get('failCommitment') === 'on',
					note: String(fd.get('note') ?? '') || undefined
				}
			);
		} catch (e) {
			return err(e);
		}
		return ok();
	},

	unfreeze: async ({ request }) => {
		const fd = await request.formData();
		try {
			await manualUnfreeze(String(fd.get('userId')));
		} catch (e) {
			return err(e);
		}
		return ok();
	}
};
