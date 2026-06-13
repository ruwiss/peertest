<script lang="ts">
	import { enhance } from '$app/forms';
	import * as m from '$lib/paraglide/messages';
	import BackLink from '$lib/components/BackLink.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const errMsg = $derived(form && 'message' in form ? form.message : null);
	const saved = $derived(form && 'success' in form);

	const taCls =
		'w-full rounded-lg border border-zinc-200 bg-white p-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';
</script>

<svelte:head><title>{m.admin_templates_title()} · {m.admin_title()}</title></svelte:head>

<section class="mx-auto max-w-4xl px-4 py-8">
	<div class="mb-4">
		<BackLink href="/admin" label={m.admin_back()} />
	</div>
	<h1 class="mt-5 mb-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
		{m.admin_templates_title()}
	</h1>
	<p class="mb-8 text-sm text-zinc-500">
		{m.admin_templates_desc({ placeholders: '{ad} {app} {saat}' })}
	</p>

	{#if errMsg}
		<p
			class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
		>
			{errMsg}
		</p>
	{:else if saved}
		<p
			class="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
		>
			{m.admin_saved()}
		</p>
	{/if}

	<div class="space-y-5">
		{#each data.items as item (item.key)}
			<div
				class="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-soft sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none"
			>
				<div class="mb-3 font-mono text-xs text-zinc-400">{item.key}</div>
				<div class="grid gap-3 sm:grid-cols-2">
					{#each [['tr', item.tr], ['en', item.en]] as [loc, text] (loc)}
						<form method="POST" action="?/save" use:enhance>
							<input type="hidden" name="key" value={item.key} />
							<input type="hidden" name="locale" value={loc} />
							<span class="mb-1 block text-xs font-medium text-zinc-500 uppercase">{loc}</span>
							<textarea name="text" rows="3" aria-label="{item.key} {loc}" class={taCls}
								>{text}</textarea
							>
							<div class="mt-1 flex justify-end">
								<button
									class="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
									type="submit">{m.admin_save_btn()}</button
								>
							</div>
						</form>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</section>
