<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import SlotPips from '$lib/components/SlotPips.svelte';
	import { appStatusTone } from '$lib/utils/status';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Tab = 'users' | 'apps' | 'reports' | 'frozen';
	// URL'de tab/rs varsa ilgili sekmeyi ac (admin?tab=apps, admin?rs=resolved gibi linklerden gelis icin).
	function resolveInitialTab(): Tab {
		const t = page.url.searchParams.get('tab');
		if (t === 'users' || t === 'apps' || t === 'reports' || t === 'frozen') return t;
		return page.url.searchParams.has('rs') ? 'reports' : 'users';
	}
	let tab = $state<Tab>(resolveInitialTab());
	const errMsg = $derived(form && 'message' in form ? form.message : null);

	const appStatusLabel: Record<string, () => string> = {
		active: m.app_status_active,
		frozen: m.app_status_frozen,
		closed: m.app_status_closed
	};

	// Uygulama silme modali: secili app + opsiyonel sebep (sahibe DM gider).
	let deleteApp = $state<{ id: string; name: string } | null>(null);
	let deleteReason = $state('');

	const inputCls =
		'rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';
	const btn =
		'rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800';
</script>

<svelte:head><title>{m.admin_title()} · {m.app_name()}</title></svelte:head>

<section class="mx-auto max-w-5xl px-4 py-6 sm:py-8">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
			{m.admin_title()}
		</h1>
		<div class="flex flex-wrap gap-2 text-sm">
			<a href="/admin/settings" class={btn}>{m.admin_link_settings()}</a>
			<a href="/admin/templates" class={btn}>{m.admin_link_templates()}</a>
		</div>
	</div>

	<div
		class="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-zinc-200 px-4 dark:border-zinc-800"
	>
		{#each [{ k: 'users', label: `${m.admin_tab_users()} (${data.users.length})` }, { k: 'apps', label: `${m.admin_tab_apps()} (${data.apps.length})` }, { k: 'reports', label: `${m.admin_tab_reports()} (${data.reports.length})` }, { k: 'frozen', label: `${m.admin_tab_frozen()} (${data.frozen.length})` }] as t (t.k)}
			<button
				onclick={() => (tab = t.k as typeof tab)}
				class="shrink-0 border-b-2 px-3 py-2 text-sm font-medium {tab === t.k
					? 'border-tg-600 text-zinc-900 dark:text-zinc-100'
					: 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}"
			>
				{t.label}
			</button>
		{/each}
	</div>

	{#if errMsg}
		<p
			class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
		>
			{errMsg}
		</p>
	{/if}

	{#if tab === 'users'}
		<form method="GET" class="mb-4 flex flex-wrap gap-2">
			<input
				name="q"
				value={data.q}
				placeholder={m.admin_search_placeholder()}
				class="{inputCls} w-full sm:w-72"
			/>
			<button class={btn} type="submit">{m.admin_search_btn()}</button>
		</form>

		<div class="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
			<table class="w-full text-sm">
				<thead class="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-zinc-900">
					<tr>
						<th class="p-3">{m.admin_th_user()}</th>
						<th class="p-3">{m.admin_th_score()}</th>
						<th class="p-3">{m.admin_th_completed()}</th>
						<th class="p-3">{m.admin_th_reports()}</th>
						<th class="p-3">{m.admin_th_action()}</th>
					</tr>
				</thead>
				<tbody>
					{#each data.users as u (u.id)}
						<tr class="border-t border-zinc-100 dark:border-zinc-800">
							<td class="p-3">
								<a href="/admin/users/{u.id}" class="block hover:underline">
									<div class="font-medium text-zinc-900 dark:text-zinc-100">{u.firstName}</div>
									<div class="font-mono text-xs text-zinc-400">
										{u.username ? '@' + u.username : ''} · {u.telegramId}{u.role === 'admin'
											? ' · admin'
											: ''}
									</div>
								</a>
							</td>
							<td
								class="p-3 font-mono {u.score < 0
									? 'text-red-600'
									: u.score < 50
										? 'text-amber-600'
										: 'text-zinc-700 dark:text-zinc-300'}">{u.score}</td
							>
							<td class="p-3 font-mono text-zinc-500">{u.completedCount}</td>
							<td class="p-3 font-mono text-zinc-500">{u.reportsAgainst}</td>
							<td class="p-3">
								<div class="flex flex-wrap items-center gap-1">
									<form
										method="POST"
										action="?/adjustScore"
										use:enhance
										class="flex items-center gap-1"
									>
										<input type="hidden" name="userId" value={u.id} />
										<input name="delta" type="number" placeholder="+/-" class="{inputCls} w-16" />
										<button class={btn} type="submit">{m.admin_action_score()}</button>
									</form>
									<form method="POST" action="?/shadowban" use:enhance>
										<input type="hidden" name="userId" value={u.id} />
										<button class={btn} type="submit">{m.admin_action_shadowban()}</button>
									</form>
									<form
										method="POST"
										action="?/deleteUser"
										use:enhance
										onsubmit={(e) => {
											if (!confirm(m.admin_action_delete_confirm())) e.preventDefault();
										}}
									>
										<input type="hidden" name="userId" value={u.id} />
										<button class="{btn} text-red-600 dark:text-red-400" type="submit"
											>{m.admin_action_delete()}</button
										>
									</form>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else if tab === 'apps'}
		<form method="GET" class="mb-4 flex flex-wrap gap-2">
			<input type="hidden" name="tab" value="apps" />
			<input
				name="aq"
				value={data.aq}
				placeholder={m.admin_apps_search_placeholder()}
				class="{inputCls} w-full sm:w-72"
			/>
			<button class={btn} type="submit">{m.admin_search_btn()}</button>
		</form>

		{#if data.apps.length === 0}
			<p
				class="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800"
			>
				{m.admin_apps_empty()}
			</p>
		{:else}
			<div class="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
				<table class="w-full text-sm">
					<thead class="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-zinc-900">
						<tr>
							<th class="p-3">{m.admin_th_app()}</th>
							<th class="p-3">{m.admin_th_user()}</th>
							<th class="p-3">{m.admin_th_status()}</th>
							<th class="p-3">{m.admin_th_filled()}</th>
							<th class="p-3">{m.admin_th_action()}</th>
						</tr>
					</thead>
					<tbody>
						{#each data.apps as a (a.id)}
							<tr class="border-t border-zinc-100 dark:border-zinc-800">
								<td class="p-3">
									<a href="/admin/apps/{a.id}" class="flex items-center gap-3 hover:underline">
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
									<a href="/admin/users/{a.owner.id}" class="hover:underline">
										<div class="font-medium text-zinc-900 dark:text-zinc-100">
											{a.owner.firstName}
										</div>
										{#if a.owner.username}
											<div class="font-mono text-xs text-zinc-400">@{a.owner.username}</div>
										{/if}
									</a>
								</td>
								<td class="p-3">
									<StatusBadge tone={appStatusTone(a.status)} label={appStatusLabel[a.status]()} />
								</td>
								<td class="p-3"><SlotPips filled={a.filled} total={a.slotsTotal} /></td>
								<td class="p-3">
									<button
										type="button"
										onclick={() => {
											deleteApp = { id: a.id, name: a.name };
											deleteReason = '';
										}}
										class="{btn} text-red-600 dark:text-red-400">{m.admin_action_delete()}</button
									>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{:else if tab === 'reports'}
		<div class="mb-4 flex gap-1 text-xs">
			{#each [{ s: 'open', label: m.admin_reports_open() }, { s: 'resolved', label: m.admin_reports_resolved() }, { s: 'dismissed', label: m.admin_reports_dismissed() }] as f (f.s)}
				<a
					href="?rs={f.s}"
					class="rounded-lg border px-2.5 py-1 font-medium {data.reportStatus === f.s
						? 'border-tg-600 bg-tg-50 text-tg-700 dark:bg-tg-500/10 dark:text-tg-300'
						: 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'}"
				>
					{f.label}
				</a>
			{/each}
		</div>
		{#if data.reports.length === 0}
			<p
				class="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800"
			>
				{m.admin_reports_empty()}
			</p>
		{:else}
			<div class="space-y-3">
				{#each data.reports as r (r.id)}
					<div
						class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
					>
						<div class="mb-1 flex flex-wrap items-center gap-2">
							{#if r.app}
								<span
									class="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
									>{m.admin_report_kind_app()}</span
								>
							{:else}
								<span
									class="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
									>{m.admin_report_kind_tester()}</span
								>
							{/if}
						</div>
						<div class="text-sm">
							<span class="font-medium text-zinc-900 dark:text-zinc-100"
								>{r.reporter.firstName}</span
							>
							<span class="text-zinc-400"> {m.admin_reported_action()} </span>
							<span class="font-medium text-zinc-900 dark:text-zinc-100"
								>{r.reported.firstName}</span
							>
							<span class="font-mono text-xs text-zinc-400">
								{m.admin_reported_score({ score: r.reported.score })}
							</span>
						</div>
						{#if r.app}
							<div class="mt-0.5 text-xs text-zinc-500">
								{m.admin_reported_app_label()}:
								<a href="/admin/apps/{r.app.id}" class="font-medium text-tg-600 hover:underline"
									>{r.app.name}</a
								>
							</div>
						{/if}
						<p class="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{r.reason}</p>

						{#if r.screenshots.length}
							<div class="mt-2 flex flex-wrap gap-2">
								{#each r.screenshots as s, i (i)}
									<a href={s.shareUrl} target="_blank" rel="noopener noreferrer">
										<img
											src={s.url}
											alt=""
											class="size-16 rounded border border-zinc-200 object-cover dark:border-zinc-700"
										/>
									</a>
								{/each}
							</div>
						{/if}

						{#if r.status === 'open'}
							<form
								method="POST"
								action="?/resolveReport"
								use:enhance
								class="mt-3 flex flex-wrap items-center gap-2"
							>
								<input type="hidden" name="reportId" value={r.id} />
								<select name="decision" class={inputCls}>
									<option value="penalize">{m.admin_decision_penalize()}</option>
									<option value="dismiss">{m.admin_decision_dismiss()}</option>
								</select>
								<input
									name="penalty"
									type="number"
									placeholder={m.admin_penalty_placeholder()}
									class="{inputCls} w-24"
								/>
								<label class="flex items-center gap-1 text-xs text-zinc-500">
									<input type="checkbox" name="failCommitment" />
									{m.admin_fail_commitment()}
								</label>
								<input
									name="note"
									placeholder={m.admin_note_placeholder()}
									class="{inputCls} w-40"
								/>
								<button class={btn} type="submit">{m.admin_decide_btn()}</button>
							</form>
						{:else}
							<div class="mt-3 text-xs text-zinc-500">
								{m.admin_decided()}
								<span class="font-medium">
									{r.status === 'resolved'
										? m.admin_decided_resolved()
										: m.admin_decided_dismissed()}
								</span>
								{#if r.adminNote}· {r.adminNote}{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{:else if data.frozen.length === 0}
		<p
			class="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800"
		>
			{m.admin_frozen_empty()}
		</p>
	{:else}
		<div class="space-y-2">
			{#each data.frozen as f (f.id)}
				<div
					class="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
				>
					<div>
						<span class="font-medium text-zinc-900 dark:text-zinc-100">{f.name}</span>
						<span class="text-sm text-zinc-400"> · {f.owner.firstName}</span>
					</div>
					<form method="POST" action="?/unfreeze" use:enhance>
						<input type="hidden" name="userId" value={f.owner.id} />
						<button class={btn} type="submit">{m.admin_frozen_unfreeze()}</button>
					</form>
				</div>
			{/each}
		</div>
	{/if}
</section>

{#if deleteApp}
	<!-- Uygulama silme onayi + opsiyonel sebep (botu baglamis sahibe DM gider). -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="button"
		tabindex="0"
		onclick={(e) => {
			if (e.target === e.currentTarget) deleteApp = null;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') deleteApp = null;
		}}
	>
		<div
			class="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
		>
			<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
				{m.admin_app_delete_modal_title({ app: deleteApp.name })}
			</h2>
			<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{m.admin_app_delete_modal_desc()}</p>

			<form
				method="POST"
				action="?/deleteApp"
				use:enhance={() => {
					return async ({ update, result }) => {
						await update();
						if (result.type === 'success') deleteApp = null;
					};
				}}
				class="mt-4 space-y-4"
			>
				<input type="hidden" name="appId" value={deleteApp.id} />
				<div>
					<label
						for="del-reason"
						class="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
					>
						{m.admin_app_delete_reason_label()}
					</label>
					<textarea
						id="del-reason"
						name="reason"
						bind:value={deleteReason}
						rows="3"
						placeholder={m.admin_app_delete_reason_placeholder()}
						class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
					></textarea>
					<p class="mt-1 text-xs text-zinc-400">{m.admin_app_delete_reason_hint()}</p>
				</div>

				<div class="flex justify-end gap-2 pt-1">
					<button
						type="button"
						onclick={() => (deleteApp = null)}
						class="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
					>
						{m.admin_broadcast_cancel()}
					</button>
					<button
						type="submit"
						class="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
					>
						{m.admin_app_delete_btn()}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
