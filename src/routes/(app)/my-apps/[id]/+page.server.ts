import { error, fail } from '@sveltejs/kit';
import { and, eq, or } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { apps } from '$lib/server/db/schema';
import { listAppCommitmentsForOwner, cancelCommitment } from '$lib/server/commitment';
import { createReport } from '$lib/server/report';
import { isUuid } from '$lib/utils/slug';

async function resolveOwnedAppId(ownerId: string, slug: string): Promise<string | null> {
	// Slug ya UUID ya da packageName olabilir. Sahibi kontrolüyle birlikte cek.
	const whereLookup = isUuid(slug)
		? or(eq(apps.id, slug), eq(apps.packageName, slug))
		: eq(apps.packageName, slug);
	const rows = await db
		.select({ id: apps.id })
		.from(apps)
		.where(and(eq(apps.userId, ownerId), whereLookup))
		.limit(1);
	return rows[0]?.id ?? null;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const appId = await resolveOwnedAppId(locals.user!.id, params.id);
	if (!appId) error(404, 'Uygulama bulunamadı.');
	try {
		const data = await listAppCommitmentsForOwner(locals.user!.id, appId);
		return { ...data, appId };
	} catch (e) {
		error(404, (e as Error).message);
	}
};

export const actions: Actions = {
	report: async ({ request, locals }) => {
		const fd = await request.formData();
		try {
			await createReport(
				locals.user!.id,
				String(fd.get('commitmentId')),
				String(fd.get('reason') ?? '')
			);
		} catch (e) {
			return fail(400, { message: (e as Error).message });
		}
		return { success: true };
	},

	remove: async ({ request, locals }) => {
		const fd = await request.formData();
		try {
			// cancelCommitment app sahibinin de cikarmasina izin verir.
			await cancelCommitment(locals.user!.id, String(fd.get('commitmentId')));
		} catch (e) {
			return fail(400, { message: (e as Error).message });
		}
		return { success: true };
	}
};
