<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	interface Props {
		/** Menu icerigi. close() ile menuyu kapatabilirsin (aksiyon sonrasi cagir). */
		children: Snippet<[() => void]>;
		label?: string;
		/** Panel hizalamasi: saga (varsayilan) ya da sola yasli. */
		align?: 'right' | 'left';
	}
	let { children, label = 'Diğer işlemler', align = 'right' }: Props = $props();

	let open = $state(false);
	let rootEl = $state<HTMLDivElement>();
	const close = () => (open = false);

	function onWindowClick(e: MouseEvent) {
		if (!open) return;
		const t = e.target as Node | null;
		if (rootEl && t && !rootEl.contains(t)) open = false;
	}
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={onKey} />

<div bind:this={rootEl} class="relative">
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label={label}
		class="inline-flex size-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
	>
		<Icon name="dots" class="size-5" />
	</button>

	{#if open}
		<div
			role="menu"
			class="absolute z-50 mt-1.5 min-w-48 origin-top {align === 'right'
				? 'right-0 origin-top-right'
				: 'left-0 origin-top-left'} rounded-xl border border-zinc-200/80 bg-white p-1 shadow-lg ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/5"
		>
			{@render children(close)}
		</div>
	{/if}
</div>
