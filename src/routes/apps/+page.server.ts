import type { PageServerLoad } from './$types';
import { listAvailableApps, type PaginatedApps } from '$lib/server/apps';
import { getJoinedAppIds } from '$lib/server/commitment';
import { getSetting } from '$lib/server/config';

export const load: PageServerLoad = async ({ locals, url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const pageRaw = Number(url.searchParams.get('page') ?? '1');
	const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

	let result: PaginatedApps = { items: [], total: 0, page: 1, perPage: 15, totalPages: 1 };
	let joinedAppIds: string[] = [];
	let dbReady = true;
	try {
		result = await listAvailableApps({ q, page, perPage: 15 });
		if (locals.user) joinedAppIds = await getJoinedAppIds(locals.user.id);
	} catch (err) {
		console.warn('[home] uygulama listesi alinamadi:', err);
		dbReady = false;
	}
	const score = await getSetting('score');

	return {
		apps: result.items,
		total: result.total,
		page: result.page,
		perPage: result.perPage,
		totalPages: result.totalPages,
		q,
		joinedAppIds,
		dbReady,
		dimBelow: score.dimBelow,
		currentUserId: locals.user?.id ?? null,
		loggedIn: !!locals.user
	};
};
