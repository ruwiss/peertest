<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	interface Props {
		filled: number;
		total: number;
		size?: 'sm' | 'lg';
	}
	let { filled, total, size = 'sm' }: Props = $props();

	const pips = $derived(Array.from({ length: total }, (_, i) => i < filled));
	const free = $derived(total - filled);
	const pipClass = $derived(size === 'lg' ? 'size-2.5' : 'size-2');
</script>

<div class="flex items-center gap-2">
	<div class="flex items-center gap-0.5" aria-hidden="true">
		{#each pips as isFilled, i (i)}
			<span
				class="{pipClass} rounded-[2px] {isFilled
					? 'bg-zinc-800 dark:bg-zinc-200'
					: 'bg-zinc-200 dark:bg-zinc-700'}"
			></span>
		{/each}
	</div>
	<span class="font-mono text-xs text-zinc-500 dark:text-zinc-400">
		{filled}/{total}
		<span class="text-zinc-400 dark:text-zinc-500">· {m.slot_free({ count: free })}</span>
	</span>
</div>
