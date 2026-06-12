import { error, fail } from '@sveltejs/kit';
import { and, desc, eq, inArray, or } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { apps, commitments, trades, users } from '$lib/server/db/schema';
import { getSetting } from '$lib/server/config';
import { createAppReport } from '$lib/server/report';
import { filledByApp } from '$lib/server/apps';
import { scoreTone } from '$lib/utils/score';
import { isUuid } from '$lib/utils/slug';

export const load: PageServerLoad = async ({ params, locals }) => {
	// URL slug: ya UUID ya da packageName olabilir. Filtreyi ona gore sec.
	const slug = params.id;
	const whereLookup = isUuid(slug)
		? or(eq(apps.id, slug), eq(apps.packageName, slug))
		: eq(apps.packageName, slug);

	const rows = await db
		.select({
			id: apps.id,
			name: apps.name,
			packageName: apps.packageName,
			appLink: apps.appLink,
			groupLink: apps.groupLink,
			iconUrl: apps.iconUrl,
			summary: apps.summary,
			category: apps.category,
			description: apps.description,
			slotsTotal: apps.slotsTotal,
			status: apps.status,
			ownerId: users.id,
			ownerFirstName: users.firstName,
			ownerUsername: users.username,
			ownerAvatar: users.avatarUrl,
			ownerScore: users.score
		})
		.from(apps)
		.innerJoin(users, eq(apps.userId, users.id))
		.where(whereLookup)
		.orderBy(desc(apps.createdAt))
		.limit(1);

	if (rows.length === 0) error(404, 'Uygulama bulunamadı.');
	const app = rows[0];

	// Score esikleri (hide/dim).
	const score = await getSetting('score');
	if (app.ownerScore < score.hideBelow) error(404, 'Uygulama bulunamadı.');

	// Dolu slot sayisi: completed VEYA en az 1 submitted checkpoint'i olan commitment'lar.
	// (Ilk kanitini gondermemis 'active' taahhutler slot tutmaz — listeyle ayni mantik.)
	const filled = (await filledByApp([app.id])).get(app.id) ?? 0;

	// Erisim hakki: sahip VEYA aktif/tamamlanmis taahhudu olan tester.
	let isOwner = false;
	let joinedStatus: 'active' | 'completed' | null = null;
	if (locals.user) {
		isOwner = app.ownerId === locals.user.id;
		if (!isOwner) {
			const c = await db
				.select({ status: commitments.status })
				.from(commitments)
				.where(
					and(
						eq(commitments.testerId, locals.user.id),
						eq(commitments.appId, app.id),
						inArray(commitments.status, ['active', 'completed'])
					)
				)
				.limit(1);
			if (c.length > 0) joinedStatus = c[0].status as 'active' | 'completed';
		}
	}
	const hasAccess = isOwner || joinedStatus !== null;

	const free = Math.max(0, app.slotsTotal - filled);
	const dim = app.ownerScore < score.dimBelow;

	// Kullanicinin trade modunda sunabilecegi kendi app'leri (aktif olanlar).
	// Kendi listede bos olsa bile modal'da "Karşılıklı" pasif olacak (UI'da kontrol).
	let myOwnApps: Array<{ id: string; name: string; iconUrl: string | null }> = [];
	// Bana yonelik bekleyen trade: bu app'in sahibi bana bu app'i (offered) sunup
	// karsiliginda benim bir app'imi (target) istemis. Eger varsa modal'i kisaltacagiz:
	// "Karsilikli mi karsiliksiz mi" sorusu atlanir; dogrudan "katil" + match olur.
	let pendingIncomingTrade: {
		tradeId: string;
		targetAppId: string;
		targetAppName: string;
	} | null = null;
	if (locals.user && !isOwner) {
		myOwnApps = await db
			.select({ id: apps.id, name: apps.name, iconUrl: apps.iconUrl })
			.from(apps)
			.where(and(eq(apps.userId, locals.user.id), eq(apps.status, 'active')))
			.orderBy(desc(apps.createdAt));

		if (myOwnApps.length > 0) {
			const myAppIds = myOwnApps.map((a) => a.id);
			// Karsi taraf (= bu app'in sahibi) bana zaten teklif acmis mi? Once eslesip
			// hemen kabul edilebilen ilk teklifi seciyoruz (en yenisi).
			const incoming = await db
				.select({
					id: trades.id,
					targetAppId: trades.targetAppId
				})
				.from(trades)
				.where(
					and(
						eq(trades.requesterId, app.ownerId),
						eq(trades.offeredAppId, app.id),
						eq(trades.status, 'requested'),
						inArray(trades.targetAppId, myAppIds)
					)
				)
				.orderBy(desc(trades.createdAt))
				.limit(1);

			if (incoming.length > 0) {
				const targetAppName = myOwnApps.find((a) => a.id === incoming[0].targetAppId)?.name ?? '?';
				pendingIncomingTrade = {
					tradeId: incoming[0].id,
					targetAppId: incoming[0].targetAppId,
					targetAppName
				};
			}
		}
	}

	return {
		app: {
			id: app.id,
			name: app.name,
			packageName: app.packageName,
			iconUrl: app.iconUrl,
			summary: app.summary,
			category: app.category,
			description: app.description,
			status: app.status,
			slotsTotal: app.slotsTotal,
			filled,
			free,
			dim
		},
		owner: {
			id: app.ownerId,
			firstName: app.ownerFirstName,
			username: app.ownerUsername,
			avatarUrl: app.ownerAvatar,
			score: app.ownerScore,
			tone: scoreTone(app.ownerScore, score.dimBelow)
		},
		access: {
			isOwner,
			joinedStatus,
			hasAccess,
			// Sadece erisim varsa Play Store + Groups linkleri yollanir.
			appLink: hasAccess ? app.appLink : null,
			groupLink: hasAccess ? app.groupLink : null
		},
		dimBelow: score.dimBelow,
		loggedIn: !!locals.user,
		isAdmin: locals.user?.role === 'admin',
		botStarted: !!locals.user?.botStarted,
		myOwnApps,
		pendingIncomingTrade
	};
};

export const actions: Actions = {
	// Kullanici bu uygulamayi sikayet eder. appId form'dan gelir (sayfadaki app).
	report: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { reportError: 'Önce giriş yapmalısın.' });
		const fd = await request.formData();
		const appId = String(fd.get('appId') ?? '');
		const reason = String(fd.get('reason') ?? '');
		try {
			await createAppReport(locals.user.id, appId, reason);
		} catch (e) {
			return fail(400, { reportError: (e as Error).message });
		}
		return { reported: true as const };
	}
};
