<script lang="ts">
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import * as m from '$lib/paraglide/messages';
	import type { PageData } from './$types';
	import AppRow from '$lib/components/AppRow.svelte';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let query = $state(data.q);
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	function navigate(nextQ: string, nextPage: number) {
		const params = new SvelteURLSearchParams();
		if (nextQ.trim()) params.set('q', nextQ.trim());
		if (nextPage > 1) params.set('page', String(nextPage));
		const qs = params.toString();
		goto(qs ? `/?${qs}` : '/', { replaceState: false, keepFocus: true, noScroll: false });
	}

	function onInput(v: string) {
		query = v;
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => navigate(v, 1), 250);
	}

	function clearQuery() {
		query = '';
		if (searchTimer) clearTimeout(searchTimer);
		navigate('', 1);
	}

	const hasPrev = $derived(data.page > 1);
	const hasNext = $derived(data.page < data.totalPages);
</script>

<svelte:head>
	<title>{m.home_title()} · {m.app_name()}</title>
</svelte:head>

<section class="mx-auto max-w-5xl px-4 py-6 sm:py-8">
	<!-- Baslik satiri: sadece baslik + sag taraf My Apps butonu -->
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
			{m.home_title()}
		</h1>
		{#if data.loggedIn}
			<a
				href="/my-apps"
				class="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
			>
				{m.home_my_apps()}
			</a>
		{/if}
	</div>

	<!-- Tam genislik search bar: tek odak noktasi -->
	<div class="relative mb-5">
		<svg
			class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="11" cy="11" r="7" />
			<path d="m21 21-4.3-4.3" />
		</svg>
		<input
			type="search"
			value={query}
			oninput={(e) => onInput((e.currentTarget as HTMLInputElement).value)}
			placeholder={m.home_search_placeholder()}
			class="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pr-10 pl-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-tg-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
		/>
		{#if query}
			<button
				type="button"
				onclick={clearQuery}
				aria-label={m.home_search_clear()}
				class="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
			>
				<svg
					class="size-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M18 6 6 18M6 6l12 12" />
				</svg>
			</button>
		{/if}
	</div>

	{#if !data.dbReady}
		<div
			class="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
		>
			{m.home_db_not_ready()}
		</div>
	{:else if data.apps.length === 0}
		<div
			class="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center dark:border-zinc-800 dark:bg-zinc-900/50"
		>
			<p class="text-sm text-zinc-500">
				{data.q ? m.home_no_results() : data.loggedIn ? m.home_empty_logged() : m.home_empty_anon()}
			</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each data.apps as app (app.id)}
				<AppRow
					{app}
					loggedIn={data.loggedIn}
					isOwn={app.owner.id === data.currentUserId}
					joined={data.joinedAppIds.includes(app.id)}
					dimBelow={data.dimBelow}
				/>
			{/each}
		</div>

		{#if data.totalPages > 1}
			<nav class="mt-6 flex items-center justify-between gap-2 text-sm">
				<button
					type="button"
					disabled={!hasPrev}
					onclick={() => navigate(data.q, data.page - 1)}
					class="rounded-lg border border-zinc-200 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
				>
					← {m.home_page_prev()}
				</button>
				<div class="font-mono text-xs text-zinc-500">
					{m.home_page_of({ page: data.page, total: data.totalPages })}
				</div>
				<button
					type="button"
					disabled={!hasNext}
					onclick={() => navigate(data.q, data.page + 1)}
					class="rounded-lg border border-zinc-200 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
				>
					{m.home_page_next()} →
				</button>
			</nav>
		{/if}
	{/if}
</section>
