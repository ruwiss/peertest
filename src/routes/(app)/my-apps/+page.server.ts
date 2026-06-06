import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	listOwnedApps,
	createApp,
	updateApp,
	deleteApp,
	closeApp,
	reopenApp,
	type AppInput,
	type OwnedApp
} from '$lib/server/apps';

export const load: PageServerLoad = async ({ locals }) => {
	let apps: OwnedApp[] = [];
	let dbReady = true;
	try {
		apps = await listOwnedApps(locals.user!.id);
	} catch (err) {
		console.warn('[my-apps] load hata:', err);
		dbReady = false;
	}
	return { apps, dbReady };
};

function parseInput(fd: FormData): AppInput {
	const rawSlots = String(fd.get('slotsTotal') ?? '').trim();
	const parsedSlots = Number(rawSlots);
	// 12-20 araliginda kabul; disindaysa undefined (server default 12 kullanir).
	const slotsTotal =
		Number.isFinite(parsedSlots) && parsedSlots >= 12 && parsedSlots <= 20
			? parsedSlots
			: undefined;
	return {
		name: String(fd.get('name') ?? ''),
		appLink: String(fd.get('appLink') ?? ''),
		groupLink: String(fd.get('groupLink') ?? ''),
		packageName: (String(fd.get('packageName') ?? '') || null) as string | null,
		iconUrl: (String(fd.get('iconUrl') ?? '') || null) as string | null,
		// summary form'da yok; aciklamadan otomatik turetiyoruz (apps.ts).
		summary: null,
		category: (String(fd.get('category') ?? '') || null) as string | null,
		description: (String(fd.get('description') ?? '') || null) as string | null,
		slotsTotal,
		instructions: {
			joined: String(fd.get('inst_joined') ?? ''),
			active: String(fd.get('inst_active') ?? ''),
			completed: String(fd.get('inst_completed') ?? '')
		}
	};
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const fd = await request.formData();
		try {
			await createApp(locals.user!.id, parseInput(fd));
		} catch (e) {
			return fail(400, { message: (e as Error).message, action: 'create' as const, id: '' });
		}
		return { success: true };
	},

	update: async ({ request, locals }) => {
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		try {
			await updateApp(locals.user!.id, id, parseInput(fd));
		} catch (e) {
			return fail(400, { message: (e as Error).message, action: 'update' as const, id });
		}
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		try {
			await deleteApp(locals.user!.id, id);
		} catch (e) {
			return fail(400, { message: (e as Error).message, action: 'delete' as const, id });
		}
		return { success: true };
	},

	close: async ({ request, locals }) => {
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		try {
			await closeApp(locals.user!.id, id);
		} catch (e) {
			return fail(400, { message: (e as Error).message, action: 'close' as const, id });
		}
		return { success: true };
	},

	reopen: async ({ request, locals }) => {
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		try {
			await reopenApp(locals.user!.id, id);
		} catch (e) {
			return fail(400, { message: (e as Error).message, action: 'reopen' as const, id });
		}
		return { success: true };
	}
};
