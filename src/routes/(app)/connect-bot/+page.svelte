<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import * as m from '$lib/paraglide/messages';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let checking = $state(false);

	async function recheck() {
		checking = true;
		await invalidateAll();
		checking = false;
		// Bot artik bagliysa istenen sayfaya yonlendir.
		if (data.botStarted && data.redirectTo) {
			await goto(data.redirectTo);
		}
	}
</script>

<svelte:head>
	<title>{m.connect_bot_title()} · {m.app_name()}</title>
</svelte:head>

<section class="mx-auto max-w-2xl px-4 py-10">
	<div class="mb-6 text-center">
		<div class="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-tg-50 text-tg-700 dark:bg-tg-500/15 dark:text-tg-300">
			<Icon name="bell" class="size-7" />
		</div>
		<h1 class="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
			{m.connect_bot_title()}
		</h1>
		<p class="mx-auto mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">{m.connect_bot_desc()}</p>
	</div>

	{#if data.botStarted}
		<div
			class="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10"
		>
			<span class="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
				<Icon name="check-circle" class="size-5" />
			</span>
			<div class="min-w-0 flex-1">
				<p class="text-sm font-medium text-emerald-800 dark:text-emerald-300">{m.connect_bot_connected()}</p>
				{#if data.redirectTo && data.redirectTo !== '/'}
					<a href={data.redirectTo} class="mt-1 inline-block text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400">
						{m.connect_bot_continue()}
					</a>
				{/if}
			</div>
		</div>
	{:else if !data.botUsername}
		<div
			class="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-500/30 dark:bg-red-500/10"
		>
			<p class="text-sm text-red-700 dark:text-red-400">{m.connect_bot_missing()}</p>
		</div>
	{:else}
		<!-- Zorunluluk uyarisi -->
		<div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
			<p class="font-medium">{m.connect_bot_mandatory_title()}</p>
			<p class="mt-1 text-xs leading-relaxed text-amber-800/90 dark:text-amber-300/90">
				{m.connect_bot_mandatory_body()}
			</p>
		</div>

		<div
			class="space-y-5 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
		>
			<ol class="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
				<li class="flex items-start gap-3">
					<span class="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-tg-100 font-mono text-xs font-semibold text-tg-700 dark:bg-tg-500/20 dark:text-tg-300">1</span>
					<span>{m.connect_bot_step_1()}</span>
				</li>
				<li class="flex items-start gap-3">
					<span class="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-tg-100 font-mono text-xs font-semibold text-tg-700 dark:bg-tg-500/20 dark:text-tg-300">2</span>
					<span>{m.connect_bot_step_2()}</span>
				</li>
				<li class="flex items-start gap-3">
					<span class="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-tg-100 font-mono text-xs font-semibold text-tg-700 dark:bg-tg-500/20 dark:text-tg-300">3</span>
					<span>{m.connect_bot_step_3()}</span>
				</li>
			</ol>

			<div class="flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
				<a
					href={data.deepLink}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-tg-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-tg-500"
				>
					{m.connect_bot_cta()}
				</a>
				<button
					onclick={recheck}
					disabled={checking}
					class="inline-flex flex-1 items-center justify-center rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
				>
					{checking ? m.connect_bot_checking() : m.connect_bot_check()}
				</button>
			</div>
		</div>
	{/if}
</section>
