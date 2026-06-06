<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { MyCommitment, MyCheckpoint } from '$lib/server/commitment';
	import { commitmentStatusTone } from '$lib/utils/status';
	import { isWindowOpen } from '$lib/utils/checkpoint';
	import StatusBadge from './StatusBadge.svelte';
	import CheckpointTimeline from './CheckpointTimeline.svelte';

	interface Props {
		commitment: MyCommitment;
		now: Date;
		defaultInstructions: { joined: string; active: string; completed: string };
		onupload: (commitmentId: string, cp: MyCheckpoint) => void;
		oncancel: (commitmentId: string) => void;
	}
	let { commitment, now, defaultInstructions, onupload, oncancel }: Props = $props();

	const statusLabel: Record<string, () => string> = {
		active: m.commitment_status_active,
		completed: m.commitment_status_completed,
		failed: m.commitment_status_failed,
		cancelled: m.commitment_status_cancelled
	};
	const cpKindLabel: Record<string, () => string> = {
		joined: m.checkpoint_joined,
		active: m.checkpoint_active,
		completed: m.checkpoint_completed
	};

	const openCp = $derived(
		commitment.status === 'active'
			? commitment.checkpoints.find(
					(cp) => cp.status === 'pending' && isWindowOpen(cp.windowStart, cp.windowEnd, now)
				)
			: undefined
	);

	function instructionFor(cp: MyCheckpoint): string {
		return commitment.app.instructions?.[cp.kind] ?? defaultInstructions[cp.kind];
	}

	const hasOpenWindow = $derived(!!openCp);
	// Kanit gonderildikten sonra taahhut baglayicidir; bırakma butonu gizlenir
	// (server tarafında zaten kontrol var, UI bunu yansitir).
	const canCancel = $derived(
		commitment.status === 'active' &&
			!commitment.checkpoints.some((cp) => cp.status === 'submitted')
	);
</script>

<div
	class="rounded-xl border bg-white p-5 dark:bg-zinc-900 {hasOpenWindow
		? 'border-l-4 border-zinc-200 border-l-amber-400 dark:border-zinc-800'
		: 'border-zinc-200 dark:border-zinc-800'}"
>
	<div class="mb-5 flex items-center justify-between gap-3">
		<div class="min-w-0 truncate font-medium text-zinc-900 dark:text-zinc-100">
			{commitment.app.name}
		</div>
		<StatusBadge
			tone={commitmentStatusTone(commitment.status)}
			label={statusLabel[commitment.status]()}
		/>
	</div>

	<!-- Hizli erisim: 1. Groups, 2. Play Store (sirayi UI'da gosteriyoruz) -->
	<div class="mb-4 flex flex-wrap items-center gap-2">
		<a
			href={commitment.app.groupLink}
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-1.5 rounded-lg bg-tg-50 px-3 py-1.5 text-xs font-medium text-tg-700 ring-1 ring-tg-200 ring-inset hover:bg-tg-100 dark:bg-tg-500/10 dark:text-tg-300 dark:ring-tg-500/30 dark:hover:bg-tg-500/20"
		>
			<span class="font-mono">1</span>
			{m.step_groups()}
		</a>
		<a
			href={commitment.app.appLink}
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
		>
			<span class="font-mono">2</span>
			{m.step_play_store()}
		</a>
	</div>

	<CheckpointTimeline checkpoints={commitment.checkpoints} {now} />

	{#if openCp}
		<div
			class="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10"
		>
			<div class="text-sm font-medium text-amber-900 dark:text-amber-200">
				{m.cp_open_heading({ kind: cpKindLabel[openCp.kind]() })}
			</div>
			<p class="mt-1 text-sm text-amber-800 dark:text-amber-300/90">{instructionFor(openCp)}</p>
			<div class="mt-3 flex flex-wrap gap-2">
				<button
					type="button"
					onclick={() => onupload(commitment.id, openCp!)}
					class="rounded-lg bg-tg-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-tg-500"
				>
					{m.cp_upload_btn()}
				</button>
			</div>
		</div>
	{/if}

	{#if canCancel}
		<div class="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
			<button
				type="button"
				onclick={() => oncancel(commitment.id)}
				class="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
			>
				{m.cp_cancel_commit()}
			</button>
		</div>
	{/if}
</div>
