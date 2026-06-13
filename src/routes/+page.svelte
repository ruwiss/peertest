<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { PageData } from './$types';
	import Icon from '$lib/components/Icon.svelte';

	let { data }: { data: PageData } = $props();

	// 14 gunluk cizelge: 3 kontrol noktasi. pos = 14 gunluk ray uzerinde % konum.
	const steps = $derived([
		{ n: 1, label: m.checkpoint_joined(), day: '0–2', body: m.how_cp_joined_body(), pos: 8 },
		{ n: 2, label: m.checkpoint_active(), day: '6–9', body: m.how_cp_active_body(), pos: 53 },
		{
			n: 3,
			label: m.checkpoint_completed(),
			day: '13–14',
			body: m.how_cp_completed_body(),
			pos: 95
		}
	]);
</script>

<svelte:head>
	<title>{m.how_title()} · {m.app_name()}</title>
</svelte:head>

<section class="mx-auto max-w-4xl px-4 py-12 sm:py-16">
	<!-- Hero -->
	<header class="mx-auto max-w-2xl text-center">
		<span
			class="inline-flex items-center gap-1.5 rounded-full border border-tg-200 bg-tg-50 px-3 py-1 text-xs font-semibold text-tg-700 dark:border-tg-500/30 dark:bg-tg-500/10 dark:text-tg-300"
		>
			<span class="size-1.5 rounded-full bg-tg-500"></span>
			14 {m.how_days_unit()} · 3 {m.how_checkpoints_unit()}
		</span>
		<h1 class="mt-5 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-100">
			{m.how_title()}
		</h1>
		<p class="mx-auto mt-4 text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
			{m.how_lede()}
		</p>
		<div class="mt-7 flex flex-wrap justify-center gap-3">
			{#if !data.loggedIn}
				<a
					href="/login"
					class="rounded-full bg-tg-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-tg-500 dark:shadow-none"
				>
					{m.how_cta_login()}
				</a>
			{/if}
			<a
				href="/apps"
				class="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
			>
				{m.how_cta_apps()}
			</a>
		</div>
	</header>

	<!-- Iki katilim modu -->
	<div class="mt-16 sm:mt-20">
		<h2 class="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
			{m.how_modes_title()}
		</h2>
		<div class="mt-5 grid gap-4 sm:grid-cols-2">
			<div
				class="rounded-3xl border border-zinc-200/70 bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none"
			>
				<div class="flex items-center gap-3">
					<span
						class="inline-flex size-10 items-center justify-center rounded-2xl bg-tg-100 text-tg-600 dark:bg-tg-500/20 dark:text-tg-300"
					>
						<Icon name="swap" class="size-5" />
					</span>
					<h3 class="text-lg font-bold text-zinc-900 dark:text-zinc-100">
						{m.how_mode_reciprocal_title()}
					</h3>
				</div>
				<p class="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
					{m.how_mode_reciprocal_body()}
				</p>
			</div>
			<div
				class="rounded-3xl border border-zinc-200/70 bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none"
			>
				<div class="flex items-center gap-3">
					<span
						class="inline-flex size-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
					>
						<Icon name="handshake" class="size-5" />
					</span>
					<h3 class="text-lg font-bold text-zinc-900 dark:text-zinc-100">
						{m.how_mode_free_title()}
					</h3>
				</div>
				<p class="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
					{m.how_mode_free_body()}
				</p>
			</div>
		</div>
	</div>

	<!-- 14 gunluk zaman cizelgesi: gercek gun-rayi + altinda kontrol noktasi kartlari -->
	<div class="mt-16 sm:mt-20">
		<div class="flex items-baseline justify-between gap-3">
			<h2 class="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
				{m.how_timeline_title()}
			</h2>
			<span class="hidden text-sm text-zinc-400 sm:inline">{m.how_timeline_lede()}</span>
		</div>

		<div
			class="mt-5 rounded-3xl border border-zinc-200/70 bg-white p-6 shadow-soft sm:p-8 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none"
		>
			<!-- Gun rayi: 14 gunluk yatay surec, uzerinde 3 kontrol noktasi -->
			<div class="relative px-1 pt-2 pb-1">
				<!-- Ray zemini -->
				<div class="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
					<!-- Dolu kisim: marka gradyani -->
					<div
						class="h-2 rounded-full bg-gradient-to-r from-tg-400 to-tg-600"
						style="width: {steps[steps.length - 1].pos}%"
					></div>
				</div>
				<!-- Kontrol noktasi isaretleri -->
				{#each steps as s (s.n)}
					<div class="absolute top-1.5 -translate-x-1/2" style="left: {s.pos}%" aria-hidden="true">
						<span
							class="flex size-5 items-center justify-center rounded-full bg-white font-mono text-[10px] font-bold text-tg-700 shadow ring-2 ring-tg-500 dark:bg-zinc-900 dark:text-tg-300"
						>
							{s.n}
						</span>
					</div>
				{/each}
				<!-- Gun olcek etiketleri -->
				<div class="mt-3 flex justify-between font-mono text-[11px] text-zinc-400">
					<span>{m.how_day_label({ n: 1 })}</span>
					<span>{m.how_day_label({ n: 7 })}</span>
					<span>{m.how_day_label({ n: 14 })}</span>
				</div>
			</div>

			<!-- Kontrol noktasi aciklamalari -->
			<ol class="mt-7 grid gap-3 sm:grid-cols-3">
				{#each steps as s (s.n)}
					<li
						class="rounded-2xl border border-zinc-200/70 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
					>
						<div class="flex items-center gap-2">
							<span
								class="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-tg-600 font-mono text-xs font-bold text-white"
							>
								{s.n}
							</span>
							<span class="truncate font-semibold text-zinc-900 dark:text-zinc-100">{s.label}</span>
						</div>
						<div
							class="mt-2 inline-flex items-center gap-1 rounded-full bg-tg-50 px-2 py-0.5 font-mono text-[11px] font-medium text-tg-700 dark:bg-tg-500/10 dark:text-tg-300"
						>
							{m.how_day_label({ n: s.day })}
						</div>
						<p class="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{s.body}</p>
					</li>
				{/each}
			</ol>
		</div>
	</div>
</section>
