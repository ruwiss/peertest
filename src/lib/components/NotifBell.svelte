<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import Icon from './Icon.svelte';

	interface NotifSummary {
		trades: number;
		openCheckpoints: number;
		total: number;
	}

	let { notif }: { notif: NotifSummary } = $props();

	let open = $state(false);
	let rootEl = $state<HTMLDivElement>();

	function onWindowClick(e: MouseEvent) {
		if (!open) return;
		const target = e.target as Node | null;
		if (rootEl && target && !rootEl.contains(target)) open = false;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}

	const hasAny = $derived(notif.total > 0);
	// 9+ ile sınırla; çok kalabalık olmasin.
	const badge = $derived(notif.total > 9 ? '9+' : String(notif.total));
</script>

<svelte:window onclick={onWindowClick} onkeydown={onKey} />

<div bind:this={rootEl} class="relative">
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label={m.notif_aria()}
		class="relative inline-flex size-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
	>
		<Icon name="bell" class="size-5" />
		{#if hasAny}
			<span
				class="absolute top-1 right-1.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white dark:ring-zinc-950"
			>
				{badge}
			</span>
		{/if}
	</button>

	{#if open}
		<div
			role="menu"
			class="absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-xl border border-zinc-200 bg-white p-1 shadow-lg ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/5"
		>
			<div
				class="px-3 py-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
			>
				{m.notif_title()}
			</div>

			{#if !hasAny}
				<p class="px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400">{m.notif_empty()}</p>
			{:else}
				{#if notif.openCheckpoints > 0}
					<a
						href="/commitments"
						onclick={() => (open = false)}
						role="menuitem"
						class="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800"
					>
						<span
							class="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
						>
							<Icon name="bell" class="size-4" />
						</span>
						<div class="min-w-0 flex-1">
							<div class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
								{m.notif_open_checkpoints({ count: notif.openCheckpoints })}
							</div>
							<p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
								{m.notif_open_checkpoints_body()}
							</p>
						</div>
					</a>
				{/if}

				{#if notif.trades > 0}
					<a
						href="/commitments"
						onclick={() => (open = false)}
						role="menuitem"
						class="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800"
					>
						<span
							class="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-tg-100 text-tg-700 dark:bg-tg-500/20 dark:text-tg-300"
						>
							<Icon name="swap" class="size-4" />
						</span>
						<div class="min-w-0 flex-1">
							<div class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
								{m.notif_incoming_trades({ count: notif.trades })}
							</div>
							<p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
								{m.notif_incoming_trades_body()}
							</p>
						</div>
					</a>
				{/if}
			{/if}
		</div>
	{/if}
</div>
