import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { listAppCommitmentsForAdmin, adminCancelCommitment } from '$lib/server/commitment';
import { adminDeleteApp } from '$lib/server/admin';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const { appName, ownerId, commitments } = await listAppCommitmentsForAdmin(params.id);
		const ownerRow = await db
			.select({
				id: users.id,
				firstName: users.firstName,
				username: users.username,
				avatarUrl: users.avatarUrl
			})
			.from(users)
			.where(eq(users.id, ownerId))
			.limit(1);
		return {
			appId: params.id,
			appName,
			owner: ownerRow[0] ?? null,
			commitments
		};
	} catch (e) {
		error(404, (e as Error).message);
	}
};

export const actions: Actions = {
	// Admin: bir taahhudu zorla iptal et (kanit gonderilmis olsa bile gecerli).
	cancelCommitment: async ({ request }) => {
		const fd = await request.formData();
		const commitmentId = String(fd.get('commitmentId') ?? '');
		if (!commitmentId) return fail(400, { message: 'Taahhüt ID gerekli.' });
		try {
			await adminCancelCommitment(commitmentId);
		} catch (e) {
			return fail(400, { message: (e as Error).message });
		}
		return { success: true as const };
	},

	// Admin: uygulamayi tamamen siler. Cascade tum commitments+checkpoints.
	// Opsiyonel sebep sahibe DM olarak gider.
	deleteApp: async ({ request, params }) => {
		const fd = await request.formData();
		try {
			await adminDeleteApp(params.id, String(fd.get('reason') ?? '') || undefined);
		} catch (e) {
			return fail(400, { message: (e as Error).message });
		}
		// Silindikten sonra app sayfasi 404 olur; admin paneline don.
		redirect(303, '/admin');
	}
};
