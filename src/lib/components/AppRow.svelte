<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { AppListItem } from '$lib/server/apps';
	import { appSlug } from '$lib/utils/slug';
	import SlotPips from './SlotPips.svelte';
	import ScoreBadge from './ScoreBadge.svelte';

	interface Props {
		app: AppListItem;
		loggedIn: boolean;
		isOwn: boolean;
		joined?: boolean;
		dimBelow: number;
	}
	let { app, loggedIn, isOwn, joined = false, dimBelow }: Props = $props();

	const slug = $derived(appSlug(app));
</script>

<div
	class="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 sm:gap-4 sm:p-4 dark:border-zinc-800 dark:bg-zinc-900 {app.dim
		? 'opacity-60'
		: ''}"
>
	<!-- Uygulama -->
	<div class="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-48">
		{#if app.iconUrl}
			<img src={app.iconUrl} alt="" class="size-10 shrink-0 rounded-lg object-cover" />
		{/if}
		<div class="min-w-0">
			<a
				href="/apps/{slug}"
				class="block truncate font-medium text-zinc-900 hover:underline dark:text-zinc-100"
			>
				{app.name}
			</a>
			{#if app.summary}
				<div class="truncate text-xs text-zinc-500">{app.summary}</div>
			{:else if app.packageName}
				<div class="truncate font-mono text-xs text-zinc-400">{app.packageName}</div>
			{/if}
		</div>
	</div>

	<!-- Sahip puani (ada gerek yok; tikla -> profil) -->
	<a
		href="/users/{app.owner.id}"
		title={app.owner.firstName}
		class="rounded-md transition-opacity hover:opacity-80"
	>
		<ScoreBadge score={app.owner.score} {dimBelow} />
	</a>

	<!-- Slot -->
	<SlotPips filled={app.filled} total={app.slotsTotal} />

	<!-- Aksiyon butonlari: hepsi ayni boyut + ortalanmis (inline-flex items-center justify-center + border-transparent) -->
	<div class="ml-auto">
		{#if isOwn}
			<button
				type="button"
				disabled
				title={m.app_yours()}
				class="inline-flex h-9 min-w-[88px] cursor-not-allowed items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
			>
				{m.app_join()}
			</button>
		{:else if joined}
			<a
				href="/apps/{slug}"
				class="inline-flex h-9 min-w-[88px] items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/15"
			>
				<svg class="size-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path fill-rule="evenodd" d="M16.704 5.296a1 1 0 0 1 0 1.408l-7.5 7.5a1 1 0 0 1-1.414 0l-3.5-3.5a1 1 0 1 1 1.414-1.414L8.5 12.086l6.793-6.79a1 1 0 0 1 1.411 0Z" clip-rule="evenodd" />
				</svg>
				{m.app_joined()}
			</a>
		{:else}
			<a
				href={loggedIn ? `/apps/${slug}` : '/login'}
				class="inline-flex h-9 min-w-[88px] items-center justify-center rounded-lg border border-transparent bg-tg-600 px-3 text-sm font-medium text-white hover:bg-tg-500"
			>
				{m.app_join()}
			</a>
		{/if}
	</div>
</div>
