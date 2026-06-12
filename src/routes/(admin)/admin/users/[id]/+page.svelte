<script lang="ts">
	import { enhance } from '$app/forms';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import BackLink from '$lib/components/BackLink.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import SlotPips from '$lib/components/SlotPips.svelte';
	import { appStatusTone, commitmentStatusTone } from '$lib/utils/status';
	import { appSlug } from '$lib/utils/slug';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const d = $derived(data.detail);

	const errMsg = $derived(
		form && typeof form === 'object' && 'message' in form ? form.message : null
	);
	// Basarili duyuru gonderiminin ozeti (sent/total) — bant olarak gosterilir.
	const broadcastResult = $derived(
		form && typeof form === 'object' && 'broadcast' in form
			? (form.broadcast as { sent: number; total: number })
			: null
	);
	// App'e ozel bildirim basariyla gonderildi mi?
	const notifiedOk = $derived(form && typeof form === 'object' && 'notified' in form);
	// Herkese duyuru modali + app'e ozel bildirim modali.
	let showBroadcast = $state(false);
	let notifyTarget = $state<{ id: string; name: string } | null>(null);
	let notifyMessage = $state('');

	const appStatusLabel: Record<string, () => string> = {
		active: m.app_status_active,
		frozen: m.app_status_frozen,
		closed: m.app_status_closed
	};
	const cmtStatusLabel: Record<string, () => string> = {
		active: m.commitment_status_active,
		completed: m.commitment_status_completed,
		failed: m.commitment_status_failed,
		cancelled: m.commitment_status_cancelled
	};

	function fmt(d: Date | string): string {
		return new Intl.DateTimeFormat(getLocale() === 'en' ? 'en-US' : 'tr-TR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		}).format(new Date(d));
	}
</script>

<svelte:head>
	<title>{m.admin_user_apps_title({ name: d.user.firstName })} · {m.admin_title()}</title>
</svelte:head>

<section class="mx-auto max-w-5xl px-4 py-8">
	<div class="mb-4">
		<BackLink href="/admin" label={m.admin_user_back()} />
	</div>

	{#if broadcastResult}
		<p
			class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
		>
			{m.admin_broadcast_sent({ sent: broadcastResult.sent, total: broadcastResult.total })}
		</p>
	{/if}

	{#if notifiedOk}
		<p
			class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
		>
			{m.admin_app_notify_sent()}
		</p>
	{/if}

	{#if errMsg}
		<p
			class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
		>
			{m.admin_action_failed({ message: errMsg })}
		</p>
	{/if}

	<div
		class="mb-6 flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
	>
		{#if d.user.avatarUrl}
			<img src={d.user.avatarUrl} alt="" class="size-14 rounded-full object-cover" />
		{:else}
			<div
				class="flex size-14 items-center justify-center rounded-full bg-zinc-100 text-lg font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
			>
				{d.user.firstName.charAt(0)}
			</div>
		{/if}
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<h1 class="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
					{d.user.firstName}
				</h1>
				{#if d.user.role === 'admin'}
					<span
						class="rounded-md bg-tg-50 px-2 py-0.5 text-xs font-medium text-tg-700 dark:bg-tg-500/10 dark:text-tg-300"
						>admin</span
					>
				{/if}
			</div>
			<div class="font-mono text-xs text-zinc-400">
				{d.user.username ? '@' + d.user.username : ''} · {d.user.telegramId}
			</div>
		</div>
		<div class="text-right">
			<div class="text-xs text-zinc-400 uppercase">{m.account_field_score()}</div>
			<div
				class="font-mono text-lg {d.user.score < 0
					? 'text-red-600'
					: d.user.score < 50
						? 'text-amber-600'
						: 'text-zinc-900 dark:text-zinc-100'}"
			>
				{d.user.score}
			</div>
		</div>
	</div>

	<h2 class="mt-8 mb-3 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
		{m.admin_link_user_apps()}
	</h2>
	{#if d.apps.length === 0}
		<p
			class="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800"
		>
			{m.admin_user_apps_empty()}
		</p>
	{:else}
		<div class="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
			<table class="w-full text-sm">
				<thead class="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-zinc-900">
					<tr>
						<th class="p-3">{m.admin_th_app()}</th>
						<th class="p-3">{m.admin_th_status()}</th>
						<th class="p-3">{m.admin_th_filled()}</th>
						<th class="p-3">{m.admin_th_created()}</th>
						<th class="p-3"></th>
					</tr>
				</thead>
				<tbody>
					{#each d.apps as a (a.id)}
						<tr class="border-t border-zinc-100 dark:border-zinc-800">
							<td class="p-3">
								<a href="/apps/{appSlug(a)}" class="flex items-center gap-3 hover:underline">
									{#if a.iconUrl}
										<img src={a.iconUrl} alt="" class="size-8 shrink-0 rounded-lg object-cover" />
									{:else}
										<div
											class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-medium text-zinc-400 dark:bg-zinc-800"
										>
											{a.name.charAt(0)}
										</div>
									{/if}
									<div class="min-w-0">
										<div class="truncate font-medium text-zinc-900 dark:text-zinc-100">
											{a.name}
										</div>
										{#if a.packageName}
											<div class="truncate font-mono text-xs text-zinc-400">{a.packageName}</div>
										{/if}
									</div>
								</a>
							</td>
							<td class="p-3">
								<StatusBadge tone={appStatusTone(a.status)} label={appStatusLabel[a.status]()} />
							</td>
							<td class="p-3">
								<SlotPips filled={a.filled} total={a.slotsTotal} />
							</td>
							<td class="p-3 font-mono text-xs text-zinc-500">{fmt(a.createdAt)}</td>
							<td class="p-3">
								<div class="flex flex-wrap items-center justify-end gap-1.5">
									<!-- Herkese duyuru (global) -->
									<button
										type="button"
										onclick={() => (showBroadcast = true)}
										class="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
									>
										<svg class="size-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
											<path
												d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.085l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.289Z"
											/>
										</svg>
										{m.admin_app_broadcast_all()}
									</button>
									<!-- Bu uygulamanin sahibine ozel bildirim -->
									<button
										type="button"
										onclick={() => {
											notifyTarget = { id: a.id, name: a.name };
											notifyMessage = '';
										}}
										class="inline-flex items-center gap-1 rounded-lg border border-tg-200 bg-tg-50 px-2 py-1 text-xs font-medium text-tg-700 hover:bg-tg-100 dark:border-tg-500/30 dark:bg-tg-500/10 dark:text-tg-300 dark:hover:bg-tg-500/20"
									>
										<svg class="size-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
											<path
												d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.085l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.289Z"
											/>
										</svg>
										{m.admin_app_notify_btn()}
									</button>
									<!-- Testerlari gor -->
									<a
										href="/admin/apps/{a.id}"
										class="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
									>
										{m.admin_app_view_testers()}
										<svg class="size-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
											<path
												fill-rule="evenodd"
												d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.05 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.39 4.25a.75.75 0 0 1 0 1.08l-4.39 4.25a.75.75 0 0 1-1.06-.02Z"
												clip-rule="evenodd"
											/>
										</svg>
									</a>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<h2 class="mt-8 mb-3 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
		{m.admin_user_commitments_title()}
	</h2>
	{#if d.commitments.length === 0}
		<p
			class="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800"
		>
			{m.admin_user_commitments_empty()}
		</p>
	{:else}
		<div class="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
			<table class="w-full text-sm">
				<thead class="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-zinc-900">
					<tr>
						<th class="p-3">{m.admin_th_app()}</th>
						<th class="p-3">{m.admin_th_status()}</th>
						<th class="p-3">{m.admin_th_created()}</th>
					</tr>
				</thead>
				<tbody>
					{#each d.commitments as c (c.id)}
						<tr class="border-t border-zinc-100 dark:border-zinc-800">
							<td class="p-3">
								<a
									href="/apps/{appSlug({ id: c.appId, packageName: c.appPackageName })}"
									class="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
									>{c.appName}</a
								>
							</td>
							<td class="p-3">
								<StatusBadge
									tone={commitmentStatusTone(c.status)}
									label={cmtStatusLabel[c.status]()}
								/>
							</td>
							<td class="p-3 font-mono text-xs text-zinc-500">{fmt(c.startedAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

{#if showBroadcast}
	<!-- Tum kullanicilara duyuru modali: tr + en metni, herkese kendi dilinde gider. -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="button"
		tabindex="0"
		onclick={(e) => {
			if (e.target === e.currentTarget) showBroadcast = false;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') showBroadcast = false;
		}}
	>
		<div
			class="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
		>
			<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
				{m.admin_broadcast_title()}
			</h2>
			<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{m.admin_broadcast_desc()}</p>

			<form
				method="POST"
				action="?/broadcast"
				use:enhance={() => {
					return async ({ update, result }) => {
						await update();
						if (result.type === 'success') showBroadcast = false;
					};
				}}
				onsubmit={(e) => {
					if (!confirm(m.admin_broadcast_confirm())) e.preventDefault();
				}}
				class="mt-4 space-y-4"
			>
				<div>
					<label
						for="bc-tr"
						class="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
					>
						{m.admin_broadcast_tr_label()}
					</label>
					<textarea
						id="bc-tr"
						name="bodyTr"
						rows="3"
						required
						class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
					></textarea>
				</div>
				<div>
					<label
						for="bc-en"
						class="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
					>
						{m.admin_broadcast_en_label()}
					</label>
					<textarea
						id="bc-en"
						name="bodyEn"
						rows="3"
						required
						class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
					></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-1">
					<button
						type="button"
						onclick={() => (showBroadcast = false)}
						class="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
					>
						{m.admin_broadcast_cancel()}
					</button>
					<button
						type="submit"
						class="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
					>
						{m.admin_broadcast_send()}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if notifyTarget}
	<!-- App'e ozel bildirim: yalnizca bu uygulamanin sahibine DM. -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="button"
		tabindex="0"
		onclick={(e) => {
			if (e.target === e.currentTarget) notifyTarget = null;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') notifyTarget = null;
		}}
	>
		<div
			class="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
		>
			<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
				{m.admin_app_notify_title({ app: notifyTarget.name })}
			</h2>
			<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
				{m.admin_app_notify_desc({ app: notifyTarget.name, user: d.user.firstName })}
			</p>

			<form
				method="POST"
				action="?/notifyApp"
				use:enhance={() => {
					return async ({ update, result }) => {
						await update();
						if (result.type === 'success') notifyTarget = null;
					};
				}}
				class="mt-4 space-y-4"
			>
				<input type="hidden" name="appId" value={notifyTarget.id} />
				<div>
					<label
						for="notify-msg"
						class="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
					>
						{m.admin_app_notify_label()}
					</label>
					<textarea
						id="notify-msg"
						name="message"
						rows="4"
						required
						bind:value={notifyMessage}
						placeholder={m.admin_app_notify_placeholder()}
						class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
					></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-1">
					<button
						type="button"
						onclick={() => (notifyTarget = null)}
						class="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
					>
						{m.admin_broadcast_cancel()}
					</button>
					<button
						type="submit"
						class="inline-flex items-center gap-1.5 rounded-lg bg-tg-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-tg-500"
					>
						{m.admin_app_notify_send()}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
