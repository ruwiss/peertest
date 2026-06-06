<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { MyCheckpoint } from '$lib/server/commitment';
	import { visualState, type CheckpointVisualState } from '$lib/utils/checkpoint';
	import { countdownText, formatDate } from '$lib/utils/date';

	interface Props {
		checkpoints: MyCheckpoint[];
		now: Date;
	}
	let { checkpoints, now }: Props = $props();

	const cpKindLabel: Record<string, () => string> = {
		joined: m.checkpoint_joined,
		active: m.checkpoint_active,
		completed: m.checkpoint_completed
	};

	function state(cp: MyCheckpoint): CheckpointVisualState {
		return visualState(cp.status, cp.windowStart, cp.windowEnd, now);
	}

	function sub(cp: MyCheckpoint): string {
		const s = state(cp);
		if (s === 'submitted')
			return cp.submittedAt ? `✓ ${formatDate(cp.submittedAt)}` : `✓ ${m.cp_filled_at()}`;
		if (s === 'missed') return m.cp_missed();
		if (s === 'open') return m.cp_open_in({ time: countdownText(cp.windowEnd, now) });
		return m.cp_opens_in({ time: countdownText(cp.windowStart, now) });
	}

	const nodeClass: Record<CheckpointVisualState, string> = {
		submitted: 'bg-emerald-500 text-white',
		open: 'bg-amber-500 text-white ring-4 ring-amber-500/30 animate-pulse',
		missed: 'bg-red-500 text-white',
		upcoming:
			'border-2 border-zinc-300 bg-white text-transparent dark:border-zinc-600 dark:bg-zinc-800'
	};
	// Onceki checkpoint tamamlandiysa baglanti cizgisi yesil.
	function lineClass(i: number): string {
		return state(checkpoints[i - 1]) === 'submitted'
			? 'bg-emerald-400'
			: 'bg-zinc-200 dark:bg-zinc-700';
	}
</script>

<!-- Yatay (sm+) -->
<div class="hidden grid-cols-3 sm:grid">
	{#each checkpoints as cp, i (cp.id)}
		<div class="relative flex flex-col items-center text-center">
			{#if i > 0}
				<span class="absolute top-3 right-1/2 h-0.5 w-full {lineClass(i)}"></span>
			{/if}
			<div
				class="relative z-10 flex size-6 items-center justify-center rounded-full text-xs {nodeClass[
					state(cp)
				]}"
			>
				{#if state(cp) === 'submitted'}✓{:else if state(cp) === 'missed'}✕{:else}{i + 1}{/if}
			</div>
			<div class="mt-2 text-xs font-medium text-zinc-900 dark:text-zinc-100">
				{cpKindLabel[cp.kind]()}
			</div>
			<div class="font-mono text-[11px] text-zinc-500">{sub(cp)}</div>
		</div>
	{/each}
</div>

<!-- Dikey stepper (mobil) -->
<div class="space-y-3 sm:hidden">
	{#each checkpoints as cp, i (cp.id)}
		<div class="flex items-center gap-3">
			<div
				class="flex size-6 shrink-0 items-center justify-center rounded-full text-xs {nodeClass[
					state(cp)
				]}"
			>
				{#if state(cp) === 'submitted'}✓{:else if state(cp) === 'missed'}✕{:else}{i + 1}{/if}
			</div>
			<div class="flex-1">
				<div class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
					{cpKindLabel[cp.kind]()}
				</div>
				<div class="font-mono text-xs text-zinc-500">{sub(cp)}</div>
			</div>
		</div>
	{/each}
</div>
