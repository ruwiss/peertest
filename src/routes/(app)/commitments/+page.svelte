<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import type { PageData } from './$types';
	import type { MyCheckpoint } from '$lib/server/commitment';
	import CommitmentRow from '$lib/components/CommitmentRow.svelte';
	import UploadModal from '$lib/components/UploadModal.svelte';
	import { appSlug } from '$lib/utils/slug';

	const cpKindLabel: Record<string, () => string> = {
		joined: m.checkpoint_joined,
		active: m.checkpoint_active,
		completed: m.checkpoint_completed
	};

	let { data }: { data: PageData } = $props();

	let tab = $state<'active' | 'past' | 'trades'>('active');
	let now = $state(new Date());
	let actionError = $state<string | null>(null);
	let uploadCtx = $state<{ commitmentId: string; cp: MyCheckpoint } | null>(null);
	// Son checkpoint sonrasi "lutfen X gun silme" uyarisi.
	let keepInstalledHint = $state<number | null>(null);

	// Canli geri sayim icin dakikada bir guncelle. Onmount'ta hemen bir kez de senkronize et —
	// SSR ile aradan zaman gecmis olabilir; "0 saniye" gorunmesini boylece engelleriz.
	let timer: ReturnType<typeof setInterval>;
	onMount(() => {
		now = new Date();
		timer = setInterval(() => (now = new Date()), 30_000);
	});
	onDestroy(() => clearInterval(timer));

	const active = $derived(data.commitments.filter((c) => c.status === 'active'));
	const past = $derived(data.commitments.filter((c) => c.status !== 'active'));
	const outgoingPending = $derived(data.outgoingTrades.filter((t) => t.status === 'requested'));
	const tradeBadgeCount = $derived(outgoingPending.length + data.incomingTrades.length);
	const shown = $derived(tab === 'active' ? active : tab === 'past' ? past : []);

	function startUpload(commitmentId: string, cp: MyCheckpoint) {
		actionError = null;
		uploadCtx = { commitmentId, cp };
	}

	async function onUploaded(shot: { url: string; shareUrl: string }) {
		if (!uploadCtx) return;
		try {
			const res = await fetch(`/api/commitments/${uploadCtx.commitmentId}/checkpoint`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ checkpointId: uploadCtx.cp.id, screenshots: [shot] })
			});
			if (!res.ok) {
				const b = await res.json().catch(() => ({}));
				throw new Error(b.message ?? m.upload_failed());
			}
			const body: { completed?: boolean; keepInstalledDays?: number | null } = await res
				.json()
				.catch(() => ({}));
			uploadCtx = null;
			// Son checkpoint ise + sonradan katilan bir tester varsa kibar bir uyari goster.
			if (body.completed && body.keepInstalledDays && body.keepInstalledDays > 0) {
				keepInstalledHint = body.keepInstalledDays;
			}
			await invalidateAll();
		} catch (e) {
			actionError = (e as Error).message;
			uploadCtx = null;
		}
	}

	async function cancel(commitmentId: string) {
		if (!confirm(m.cp_cancel_confirm())) return;
		actionError = null;
		try {
			const res = await fetch(`/api/commitments/${commitmentId}`, { method: 'DELETE' });
			if (!res.ok) {
				const b = await res.json().catch(() => ({}));
				throw new Error(b.message ?? m.upload_failed());
			}
			await invalidateAll();
		} catch (e) {
			actionError = (e as Error).message;
		}
	}

	function fmt(d: Date | string): string {
		return new Intl.DateTimeFormat(getLocale() === 'en' ? 'en-US' : 'tr-TR', {
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(d));
	}
</script>

<svelte:head>
	<title>{m.commitments_title()} · {m.app_name()}</title>
</svelte:head>

<section class="mx-auto max-w-5xl px-4 py-6 sm:py-8">
	<h1 class="mb-4 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
		{m.commitments_title()}
	</h1>

	<div
		class="-mx-2 mb-6 flex gap-1 overflow-x-auto border-b border-zinc-200 px-2 dark:border-zinc-800"
	>
		<button
			onclick={() => (tab = 'active')}
			class="shrink-0 border-b-2 px-3 py-2 text-sm font-medium {tab === 'active'
				? 'border-tg-600 text-zinc-900 dark:text-zinc-100'
				: 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}"
		>
			{m.commitments_tab_active()} ({active.length})
		</button>
		<button
			onclick={() => (tab = 'past')}
			class="shrink-0 border-b-2 px-3 py-2 text-sm font-medium {tab === 'past'
				? 'border-tg-600 text-zinc-900 dark:text-zinc-100'
				: 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}"
		>
			{m.commitments_tab_past()} ({past.length})
		</button>
		<button
			onclick={() => (tab = 'trades')}
			class="shrink-0 border-b-2 px-3 py-2 text-sm font-medium {tab === 'trades'
				? 'border-tg-600 text-zinc-900 dark:text-zinc-100'
				: 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}"
		>
			{m.trades_section_title()}
			{#if tradeBadgeCount > 0}
				<span
					class="ml-1 inline-flex items-center justify-center rounded-full bg-tg-100 px-1.5 text-[10px] font-semibold text-tg-700 dark:bg-tg-500/20 dark:text-tg-300"
					>{tradeBadgeCount}</span
				>
			{/if}
		</button>
	</div>

	{#if actionError}
		<p
			class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
		>
			{actionError}
		</p>
	{/if}

	{#if !data.dbReady}
		<div
			class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
		>
			{m.commitments_db_not_ready()}
		</div>
	{:else if tab === 'trades'}
		<!-- Trade istekleri sekmesi -->
		<div class="space-y-6">
			<!-- Bana gelen istekler -->
			<div>
				<h2
					class="mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
				>
					{m.trades_incoming()} ({data.incomingTrades.length})
				</h2>
				{#if data.incomingTrades.length === 0}
					<p
						class="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800"
					>
						{m.trades_empty_incoming()}
					</p>
				{:else}
					<div class="space-y-2">
						{#each data.incomingTrades as t (t.id)}
							<div
								class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
							>
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<div class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
											<a href="/users/{t.target.ownerId}" class="hover:underline"
												>{t.target.ownerName}</a
											>
											<span class="text-zinc-500">→</span>
											<a
												href="/apps/{appSlug({
													id: t.offered.appId,
													packageName: t.offered.packageName
												})}"
												class="text-tg-600 hover:underline dark:text-tg-400">{t.offered.appName}</a
											>
										</div>
										<div class="mt-1.5 grid gap-1.5 text-xs sm:grid-cols-2">
											<div class="flex items-center gap-1.5">
												<span class="text-zinc-400 uppercase">{m.trades_target_label()}:</span>
												<a
													href="/apps/{appSlug({
														id: t.target.appId,
														packageName: t.target.packageName
													})}"
													class="font-medium text-zinc-700 hover:underline dark:text-zinc-200"
													>{t.target.appName}</a
												>
											</div>
											<div class="flex items-center gap-1.5">
												<span class="text-zinc-400 uppercase">{m.trades_offer_label()}:</span>
												<a
													href="/apps/{appSlug({
														id: t.offered.appId,
														packageName: t.offered.packageName
													})}"
													class="font-medium text-zinc-700 hover:underline dark:text-zinc-200"
													>{t.offered.appName}</a
												>
											</div>
										</div>
										<p class="mt-2 text-xs text-zinc-500">{m.trades_accept_hint()}</p>
									</div>
									<a
										href="/apps/{appSlug({
											id: t.offered.appId,
											packageName: t.offered.packageName
										})}"
										class="shrink-0 rounded-lg bg-tg-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-tg-500"
									>
										{m.trades_open_app_btn()}
									</a>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Gonderdigim istekler -->
			<div>
				<h2
					class="mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
				>
					{m.trades_outgoing()} ({outgoingPending.length})
				</h2>
				{#if outgoingPending.length === 0}
					<p
						class="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800"
					>
						{m.trades_empty_outgoing()}
					</p>
				{:else}
					<div class="space-y-2">
						{#each outgoingPending as t (t.id)}
							<div
								class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
							>
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<div class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
											<a
												href="/apps/{appSlug({
													id: t.target.appId,
													packageName: t.target.packageName
												})}"
												class="text-tg-600 hover:underline dark:text-tg-400">{t.target.appName}</a
											>
											<span class="text-zinc-500">↔</span>
											<a
												href="/apps/{appSlug({
													id: t.offered.appId,
													packageName: t.offered.packageName
												})}"
												class="hover:underline">{t.offered.appName}</a
											>
										</div>
										<div class="mt-0.5 text-xs text-zinc-500">{fmt(t.createdAt)}</div>
									</div>
									<form
										method="POST"
										action="?/cancelTrade"
										use:enhance
										onsubmit={(e) => {
											if (!confirm(m.trades_cancel_confirm())) e.preventDefault();
										}}
									>
										<input type="hidden" name="tradeId" value={t.id} />
										<button
											type="submit"
											class="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
										>
											{m.trades_cancel_btn()}
										</button>
									</form>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{:else if shown.length === 0}
		<div
			class="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center dark:border-zinc-800 dark:bg-zinc-900/50"
		>
			<p class="text-sm text-zinc-500">
				{tab === 'active' ? m.commitments_empty_active() : m.commitments_empty_past()}
			</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each shown as c (c.id)}
				<CommitmentRow
					commitment={c}
					{now}
					defaultInstructions={data.defaultInstructions}
					onupload={startUpload}
					oncancel={cancel}
				/>
			{/each}
		</div>
	{/if}
</section>

{#if uploadCtx}
	<UploadModal
		title={m.upload_cp_proof({ kind: cpKindLabel[uploadCtx.cp.kind]() })}
		onuploaded={onUploaded}
		onclose={() => (uploadCtx = null)}
	/>
{/if}

<!-- Son checkpoint sonrasi "lutfen X gun silme" modali -->
{#if keepInstalledHint !== null}
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) keepInstalledHint = null;
		}}
	>
		<div
			class="w-full max-w-md rounded-t-2xl border border-zinc-200 bg-white p-6 sm:rounded-xl dark:border-zinc-800 dark:bg-zinc-900"
		>
			<div
				class="mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-tg-50 text-tg-700 dark:bg-tg-500/15 dark:text-tg-300"
			>
				<svg
					class="size-6"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path
						d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
					/>
				</svg>
			</div>
			<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
				{m.keep_installed_title()}
			</h2>
			<p class="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
				{m.keep_installed_body({ days: keepInstalledHint })}
			</p>
			<div class="mt-5 flex justify-end">
				<button
					type="button"
					onclick={() => (keepInstalledHint = null)}
					class="rounded-lg bg-tg-600 px-4 py-2 text-sm font-medium text-white hover:bg-tg-500"
				>
					{m.keep_installed_ok()}
				</button>
			</div>
		</div>
	</div>
{/if}
