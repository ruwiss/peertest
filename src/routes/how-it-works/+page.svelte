<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { PageData } from './$types';
	import Icon from '$lib/components/Icon.svelte';

	let { data }: { data: PageData } = $props();

	const rules = $derived([
		m.how_rule_1(),
		m.how_rule_2(),
		m.how_rule_3(),
		m.how_rule_4(),
		m.how_rule_5(),
		m.how_rule_6(),
		m.how_rule_7()
	]);
</script>

<svelte:head>
	<title>{m.how_title()} · {m.app_name()}</title>
</svelte:head>

<section class="mx-auto max-w-5xl px-4 py-10 sm:py-16">
	<!-- Hero - minimal -->
	<div class="mx-auto max-w-2xl text-center">
		<h1 class="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
			{m.how_title()}
		</h1>
		<p class="mt-3 text-base text-zinc-500 dark:text-zinc-400">
			{m.how_lede()}
		</p>

		<div class="mt-6 flex flex-wrap justify-center gap-2">
			{#if !data.loggedIn}
				<a
					href="/login"
					class="inline-flex items-center justify-center rounded-lg bg-tg-600 px-4 py-2 text-sm font-medium text-white hover:bg-tg-500"
				>
					{m.how_cta_login()}
				</a>
			{/if}
			<a
				href="/"
				class="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
			>
				{m.how_cta_apps()}
			</a>
		</div>
	</div>

	<!-- Iki katilim modu -->
	<div class="mx-auto mt-12 max-w-4xl sm:mt-16">
		<h2 class="text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
			{m.how_modes_title()}
		</h2>
		<div class="mt-4 grid gap-3 sm:grid-cols-2">
			<!-- Karsilikli -->
			<div class="rounded-2xl border border-tg-200 bg-tg-50/40 p-5 dark:border-tg-500/30 dark:bg-tg-500/10">
				<div class="flex items-center gap-2.5">
					<span class="inline-flex size-9 items-center justify-center rounded-xl bg-tg-100 text-tg-700 dark:bg-tg-500/20 dark:text-tg-300">
						<Icon name="swap" class="size-5" />
					</span>
					<h3 class="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
						{m.how_mode_reciprocal_title()}
					</h3>
				</div>
				<p class="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
					{m.how_mode_reciprocal_body()}
				</p>
				<ul class="mt-3 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
					<li class="flex items-start gap-2">
						<span class="mt-1 size-1.5 shrink-0 rounded-full bg-tg-500"></span>
						<span>{m.how_mode_reciprocal_li_1()}</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-1 size-1.5 shrink-0 rounded-full bg-tg-500"></span>
						<span>{m.how_mode_reciprocal_li_2()}</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-1 size-1.5 shrink-0 rounded-full bg-tg-500"></span>
						<span>{m.how_mode_reciprocal_li_3()}</span>
					</li>
				</ul>
			</div>
			<!-- Karsiliksiz -->
			<div class="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
				<div class="flex items-center gap-2.5">
					<span class="inline-flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
						<Icon name="handshake" class="size-5" />
					</span>
					<h3 class="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
						{m.how_mode_free_title()}
					</h3>
				</div>
				<p class="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
					{m.how_mode_free_body()}
				</p>
				<ul class="mt-3 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
					<li class="flex items-start gap-2">
						<span class="mt-1 size-1.5 shrink-0 rounded-full bg-emerald-500"></span>
						<span>{m.how_mode_free_li_1()}</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-1 size-1.5 shrink-0 rounded-full bg-emerald-500"></span>
						<span>{m.how_mode_free_li_2()}</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-1 size-1.5 shrink-0 rounded-full bg-emerald-500"></span>
						<span>{m.how_mode_free_li_3()}</span>
					</li>
				</ul>
			</div>
		</div>
	</div>

	<!-- 14 günlük zaman çizelgesi -->
	<div class="mx-auto mt-12 max-w-4xl sm:mt-16">
		<h2 class="text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
			{m.how_timeline_title()}
		</h2>
		<p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{m.how_timeline_lede()}</p>
		<div class="mt-4 grid gap-3 sm:grid-cols-3">
			<div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
				<div class="flex items-center gap-2 text-xs font-semibold text-tg-700 dark:text-tg-400">
					<span class="flex size-6 items-center justify-center rounded-full bg-tg-100 font-mono dark:bg-tg-500/20">1</span>
					{m.checkpoint_joined()}
				</div>
				<div class="mt-1 font-mono text-[11px] text-zinc-400">0–2 g</div>
				<p class="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
					{m.how_cp_joined_body()}
				</p>
			</div>
			<div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
				<div class="flex items-center gap-2 text-xs font-semibold text-tg-700 dark:text-tg-400">
					<span class="flex size-6 items-center justify-center rounded-full bg-tg-100 font-mono dark:bg-tg-500/20">2</span>
					{m.checkpoint_active()}
				</div>
				<div class="mt-1 font-mono text-[11px] text-zinc-400">6–9 g</div>
				<p class="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
					{m.how_cp_active_body()}
				</p>
			</div>
			<div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
				<div class="flex items-center gap-2 text-xs font-semibold text-tg-700 dark:text-tg-400">
					<span class="flex size-6 items-center justify-center rounded-full bg-tg-100 font-mono dark:bg-tg-500/20">3</span>
					{m.checkpoint_completed()}
				</div>
				<div class="mt-1 font-mono text-[11px] text-zinc-400">13–14 g</div>
				<p class="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
					{m.how_cp_completed_body()}
				</p>
			</div>
		</div>
	</div>

	<!-- Rules -->
	<div class="mx-auto mt-12 max-w-3xl sm:mt-16">
		<h2 class="text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
			{m.how_section_rules_title()}
		</h2>
		<ul class="mt-4 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
			{#each rules as rule, i (i)}
				<li class="flex items-start gap-3 px-5 py-3 text-sm text-zinc-700 dark:text-zinc-300">
					<span class="mt-1 size-1.5 shrink-0 rounded-full bg-tg-500"></span>
					<span>{rule}</span>
				</li>
			{/each}
		</ul>
	</div>
</section>
