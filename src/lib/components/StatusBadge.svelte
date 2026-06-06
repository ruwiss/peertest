<script lang="ts">
	import type { StatusTone } from '$lib/utils/status';

	interface Props {
		tone: StatusTone;
		label: string;
		size?: 'sm' | 'xs';
	}
	let { tone, label, size = 'xs' }: Props = $props();

	// Tek katman: yumusak tinted bg + ayni tonda text. Aktif/pending icin canli dot.
	const styles: Record<StatusTone, { bg: string; text: string; dot: string; pulse: boolean }> = {
		active: {
			bg: 'bg-tg-500/12 dark:bg-tg-400/15',
			text: 'text-tg-700 dark:text-tg-300',
			dot: 'bg-tg-500',
			pulse: true
		},
		submitted: {
			bg: 'bg-emerald-500/12 dark:bg-emerald-400/15',
			text: 'text-emerald-700 dark:text-emerald-300',
			dot: 'bg-emerald-500',
			pulse: false
		},
		pending: {
			bg: 'bg-amber-500/12 dark:bg-amber-400/15',
			text: 'text-amber-700 dark:text-amber-300',
			dot: 'bg-amber-500',
			pulse: true
		},
		missed: {
			bg: 'bg-red-500/12 dark:bg-red-400/15',
			text: 'text-red-700 dark:text-red-300',
			dot: 'bg-red-500',
			pulse: false
		},
		frozen: {
			bg: 'bg-cyan-500/12 dark:bg-cyan-400/15',
			text: 'text-cyan-700 dark:text-cyan-300',
			dot: 'bg-cyan-500',
			pulse: false
		},
		cancelled: {
			bg: 'bg-zinc-500/10 dark:bg-zinc-400/10',
			text: 'text-zinc-500 dark:text-zinc-400',
			dot: 'bg-zinc-400',
			pulse: false
		},
		closed: {
			bg: 'bg-zinc-500/10 dark:bg-zinc-400/10',
			text: 'text-zinc-500 dark:text-zinc-400',
			dot: 'bg-zinc-400',
			pulse: false
		},
		neutral: {
			bg: 'bg-zinc-500/10 dark:bg-zinc-400/10',
			text: 'text-zinc-500 dark:text-zinc-400',
			dot: 'bg-zinc-400',
			pulse: false
		}
	};
	const s = $derived(styles[tone]);
	const sz = $derived(size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-1.5 py-px text-[10px]');
</script>

<span
	class="inline-flex items-center gap-1 rounded-full font-semibold tracking-tight {sz} {s.bg} {s.text}"
>
	{#if s.pulse}
		<span class="relative flex size-1.5">
			<span class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 {s.dot}"></span>
			<span class="relative inline-flex size-1.5 rounded-full {s.dot}"></span>
		</span>
	{:else}
		<span class="size-1.5 rounded-full {s.dot}"></span>
	{/if}
	{label}
</span>
