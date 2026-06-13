<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	const showBotBanner = $derived(
		data.user && !data.user.botStarted && page.url.pathname !== '/connect-bot'
	);
</script>

{#if showBotBanner}
	<div class="border-b border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
		<div class="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2 text-sm">
			<span class="text-amber-800 dark:text-amber-300">
				{m.connect_bot_banner()}
			</span>
			<a
				href="/connect-bot"
				class="shrink-0 rounded-lg bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-500"
			>
				{m.connect_bot_banner_cta()}
			</a>
		</div>
	</div>
{/if}

{@render children()}
