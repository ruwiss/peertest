<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import BackLink from '$lib/components/BackLink.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { appStatusTone } from '$lib/utils/status';
	import { appSlug } from '$lib/utils/slug';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const p = $derived(data.profile);

	const appStatusLabel: Record<string, () => string> = {
		active: m.app_status_active,
		frozen: m.app_status_frozen,
		closed: m.app_status_closed
	};

	function fmt(d: Date | string): string {
		return new Intl.DateTimeFormat(getLocale() === 'en' ? 'en-US' : 'tr-TR', {
			month: 'long',
			year: 'numeric'
		}).format(new Date(d));
	}
</script>

<svelte:head>
	<title>{p.firstName} · {m.app_name()}</title>
</svelte:head>

<section class="mx-auto max-w-4xl px-4 py-8">
	<div class="mb-4">
		<BackLink href="/apps" label={m.app_detail_back()} />
	</div>

	<!-- Profil basligi -->
	<div
		class="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
	>
		<div
			class="relative h-24 bg-gradient-to-br from-tg-500/20 via-tg-300/10 to-emerald-300/10 dark:from-tg-500/15 dark:to-emerald-500/10"
		>
			<div
				class="absolute -top-px right-0 left-0 h-px bg-gradient-to-r from-transparent via-tg-300/40 to-transparent"
			></div>
		</div>
		<div class="-mt-12 px-6 pb-6">
			<div class="flex flex-wrap items-end gap-4">
				{#if p.avatarUrl}
					<img
						src={p.avatarUrl}
						alt=""
						class="size-24 rounded-2xl border-4 border-white object-cover shadow-sm dark:border-zinc-900"
					/>
				{:else}
					<div
						class="flex size-24 items-center justify-center rounded-2xl border-4 border-white bg-zinc-100 text-3xl font-semibold text-zinc-500 shadow-sm dark:border-zinc-900 dark:bg-zinc-800 dark:text-zinc-300"
					>
						{p.firstName.charAt(0)}
					</div>
				{/if}
				<div class="min-w-0 flex-1 pt-12">
					<h1 class="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
						{p.firstName}
					</h1>
					<p class="font-mono text-sm text-zinc-400">
						{p.username ? '@' + p.username : ''}
					</p>
				</div>
				<div class="pt-12">
					{#if p.username}
						<a
							href="https://t.me/{p.username}"
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-2 rounded-lg bg-tg-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-tg-500"
						>
							<svg class="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
								<path
									d="m22 2-7 20-4-9-9-4 20-7Z"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linejoin="round"
								/>
								<path
									d="M22 2 11 13"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									fill="none"
								/>
							</svg>
							{m.profile_telegram_cta()}
						</a>
					{:else}
						<span
							class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-400 dark:border-zinc-700"
						>
							{m.profile_no_username()}
						</span>
					{/if}
				</div>
			</div>

			<dl
				class="mt-6 grid grid-cols-3 gap-4 border-t border-zinc-100 pt-5 text-sm dark:border-zinc-800"
			>
				<div>
					<dt class="text-xs text-zinc-400 uppercase">{m.profile_score()}</dt>
					<dd
						class="mt-1 font-mono text-lg {p.score < 0
							? 'text-red-600'
							: p.score < 50
								? 'text-amber-600'
								: 'text-zinc-900 dark:text-zinc-100'}"
					>
						{p.score}
					</dd>
				</div>
				<div>
					<dt class="text-xs text-zinc-400 uppercase">{m.profile_completed()}</dt>
					<dd class="mt-1 font-mono text-lg text-zinc-900 dark:text-zinc-100">
						{p.completedCount}
					</dd>
				</div>
				<div>
					<dt class="text-xs text-zinc-400 uppercase">{m.profile_member_since()}</dt>
					<dd class="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{fmt(p.memberSince)}</dd>
				</div>
			</dl>
		</div>
	</div>

	<!-- Profilin acik uygulamalari -->
	<h2 class="mt-8 mb-3 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
		{m.profile_apps_title()}
	</h2>
	{#if p.apps.length === 0}
		<p
			class="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800"
		>
			{m.profile_apps_empty()}
		</p>
	{:else}
		<div class="grid gap-3 sm:grid-cols-2">
			{#each p.apps as app (app.id)}
				<a
					href="/apps/{appSlug(app)}"
					class="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 hover:border-tg-300 hover:bg-tg-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-tg-500/30 dark:hover:bg-tg-500/5"
				>
					{#if app.iconUrl}
						<img src={app.iconUrl} alt="" class="size-10 shrink-0 rounded-lg object-cover" />
					{:else}
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-sm font-medium text-zinc-400 dark:bg-zinc-800"
						>
							{app.name.charAt(0)}
						</div>
					{/if}
					<div class="min-w-0 flex-1">
						<div class="truncate font-medium text-zinc-900 dark:text-zinc-100">{app.name}</div>
					</div>
					<StatusBadge tone={appStatusTone(app.status)} label={appStatusLabel[app.status]()} />
				</a>
			{/each}
		</div>
	{/if}
</section>
