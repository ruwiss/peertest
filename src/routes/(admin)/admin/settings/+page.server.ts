import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getSetting,
	setSetting,
	type UploadSetting,
	type CheckpointWindowsSetting,
	type ScoreSetting,
	type LimitsSetting,
	type CronSetting,
	type DefaultInstructionsSetting
} from '$lib/server/config';

export const load: PageServerLoad = async () => {
	const [windows, score, limits, upload, cron, instructions] = await Promise.all([
		getSetting('checkpoint_windows'),
		getSetting('score'),
		getSetting('limits'),
		getSetting('upload'),
		getSetting('cron'),
		getSetting('default_instructions')
	]);
	return { windows, score, limits, upload, cron, instructions };
};

function num(v: FormDataEntryValue | null, fallback: number): number {
	if (v === null) return fallback;
	const n = Number(v);
	return Number.isFinite(n) ? n : fallback;
}

function str(v: FormDataEntryValue | null, fallback: string): string {
	if (v === null) return fallback;
	return String(v);
}

function bool(v: FormDataEntryValue | null): boolean {
	return v === 'on' || v === 'true' || v === '1';
}

export const actions: Actions = {
	save_score: async ({ request, locals }) => {
		const fd = await request.formData();
		const cur = await getSetting('score');
		const next: ScoreSetting = {
			start: num(fd.get('start'), cur.start),
			missPenalty: num(fd.get('missPenalty'), cur.missPenalty),
			completeReward: num(fd.get('completeReward'), cur.completeReward),
			dimBelow: num(fd.get('dimBelow'), cur.dimBelow),
			hideBelow: num(fd.get('hideBelow'), cur.hideBelow)
		};
		try {
			await setSetting('score', next, locals.user!.id);
		} catch (e) {
			return fail(400, { message: (e as Error).message });
		}
		return { success: true, section: 'score' };
	},

	save_limits: async ({ request, locals }) => {
		const fd = await request.formData();
		const cur = await getSetting('limits');
		const next: LimitsSetting = {
			defaultSlotsTotal: num(fd.get('defaultSlotsTotal'), cur.defaultSlotsTotal),
			maxAppsBeforeFirstComplete: num(
				fd.get('maxAppsBeforeFirstComplete'),
				cur.maxAppsBeforeFirstComplete
			),
			rejoinSameAppAfterCancel: bool(fd.get('rejoinSameAppAfterCancel'))
		};
		try {
			await setSetting('limits', next, locals.user!.id);
		} catch (e) {
			return fail(400, { message: (e as Error).message });
		}
		return { success: true, section: 'limits' };
	},

	save_cron: async ({ request, locals }) => {
		const fd = await request.formData();
		const cur = await getSetting('cron');
		const next: CronSetting = {
			runHourUTC: num(fd.get('runHourUTC'), cur.runHourUTC),
			reminderLeadHours: num(fd.get('reminderLeadHours'), cur.reminderLeadHours)
		};
		try {
			await setSetting('cron', next, locals.user!.id);
		} catch (e) {
			return fail(400, { message: (e as Error).message });
		}
		return { success: true, section: 'cron' };
	},

	save_windows: async ({ request, locals }) => {
		const fd = await request.formData();
		const cur = await getSetting('checkpoint_windows');
		const next: CheckpointWindowsSetting = {
			joined: {
				start: num(fd.get('joined_start'), cur.joined.start),
				end: num(fd.get('joined_end'), cur.joined.end)
			},
			active: {
				start: num(fd.get('active_start'), cur.active.start),
				end: num(fd.get('active_end'), cur.active.end)
			},
			completed: {
				start: num(fd.get('completed_start'), cur.completed.start),
				end: num(fd.get('completed_end'), cur.completed.end),
				toleranceHours: num(fd.get('completed_tolerance'), cur.completed.toleranceHours ?? 0)
			}
		};
		try {
			await setSetting('checkpoint_windows', next, locals.user!.id);
		} catch (e) {
			return fail(400, { message: (e as Error).message });
		}
		return { success: true, section: 'windows' };
	},

	save_upload: async ({ request, locals }) => {
		const fd = await request.formData();
		const cur = await getSetting('upload');
		const provider = str(fd.get('provider'), cur.provider) as UploadSetting['provider'];
		const next: UploadSetting = {
			provider,
			baseUrl: str(fd.get('baseUrl'), cur.baseUrl),
			secretKey: str(fd.get('secretKey'), cur.secretKey),
			userAgent: str(fd.get('userAgent'), cur.userAgent),
			dpi: str(fd.get('dpi'), cur.dpi),
			regex: {
				status: str(fd.get('regex_status'), cur.regex.status),
				share: str(fd.get('regex_share'), cur.regex.share),
				error: str(fd.get('regex_error'), cur.regex.error),
				cdnImg: str(fd.get('regex_cdnImg'), cur.regex.cdnImg)
			}
		};
		try {
			await setSetting('upload', next, locals.user!.id);
		} catch (e) {
			return fail(400, { message: (e as Error).message });
		}
		return { success: true, section: 'upload' };
	},

	save_instructions: async ({ request, locals }) => {
		const fd = await request.formData();
		const cur = await getSetting('default_instructions');
		const next: DefaultInstructionsSetting = {
			tr: {
				joined: str(fd.get('tr_joined'), cur.tr.joined),
				active: str(fd.get('tr_active'), cur.tr.active),
				completed: str(fd.get('tr_completed'), cur.tr.completed)
			},
			en: {
				joined: str(fd.get('en_joined'), cur.en.joined),
				active: str(fd.get('en_active'), cur.en.active),
				completed: str(fd.get('en_completed'), cur.en.completed)
			}
		};
		try {
			await setSetting('default_instructions', next, locals.user!.id);
		} catch (e) {
			return fail(400, { message: (e as Error).message });
		}
		return { success: true, section: 'instructions' };
	}
};
