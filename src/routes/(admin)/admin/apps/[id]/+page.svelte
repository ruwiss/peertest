<script lang="ts">
	import { enhance } from '$app/forms';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import type { PageData, ActionData } from './$types';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import BackLink from '$lib/components/BackLink.svelte';
	import Lightbox from '$lib/components/Lightbox.svelte';
	import { commitmentStatusTone } from '$lib/utils/status';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const errMsg = $derived(form && 'message' in form ? form.message : null);
	let lightbox = $state<{ src: string; alt: string } | null>(null);
	// Uygulama silme modali + opsiyonel sebep (sahibe DM gider).
	let showDelete = $state(false);
	let deleteReason = $state('');

	const statusLabel: Record<string, () => string> = {
		active: m.commitment_status_active,
		completed: m.commitment_status_completed,
		failed: m.commitment_status_failed,
		cancelled: m.commitment_status_cancelled
	};
	const cpStatusLabel: Record<string, () => string> = {
		pending: m.cp_status_pending,
		submitted: m.cp_status_submitted,
		missed: m.cp_status_missed
	};
	const cpKindLabel: Record<string, () => string> = {
		joined: m.checkpoint_joined,
		active: m.checkpoint_active,
		completed: m.checkpoint_completed
	};

	const cpStatusTone = (s: 'pending' | 'submitted' | 'missed') =>
		s === 'submitted' ? 'submitted' : s === 'missed' ? 'missed' : 'pending';

	function fmt(d: Date | string | null): string {
		if (!d) return '—';
		return new Intl.DateTimeFormat(getLocale() === 'en' ? 'en-US' : 'tr-TR', {
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(d));
	}
</script>

<svelte:head><title>{m.admin_app_testers_title({ app: data.appName })}</title></svelte:head>

<section class="mx-auto max-w-4xl px-4 py-8 sm:py-10">
	<div class="mb-5">
		<BackLink
			href={data.owner ? `/admin/users/${data.owner.id}` : '/admin'}
			label={m.admin_app_back()}
		/>
	</div>

	<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
				{m.admin_app_testers_title({ app: data.appName })}
			</h1>
			{#if data.owner}
				<a
					href="/users/{data.owner.id}"
					class="mt-2 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
				>
					<span>{m.admin_app_owner_label()}:</span>
					{#if data.owner.avatarUrl}
						<img src={data.owner.avatarUrl} alt="" class="size-5 rounded-full" />
					{/if}
					<span class="font-medium text-zinc-700 dark:text-zinc-200">{data.owner.firstName}</span>
					{#if data.owner.username}
						<span class="font-mono text-xs">@{data.owner.username}</span>
					{/if}
				</a>
			{/if}
		</div>

		<!-- Admin: uygulamayi tamamen sil (sebep girilebilen modal acar) -->
		<button
			type="button"
			onclick={() => {
				deleteReason = '';
				showDelete = true;
			}}
			class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/15"
		>
			<svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
				<path
					fill-rule="evenodd"
					d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4Z"
					clip-rule="evenodd"
				/>
			</svg>
			{m.admin_app_delete_btn()}
		</button>
	</div>

	{#if errMsg}
		<p
			class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
		>
			{m.admin_action_failed({ message: errMsg })}
		</p>
	{/if}

	{#if data.commitments.length === 0}
		<p
			class="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800"
		>
			{m.admin_app_no_testers()}
		</p>
	{:else}
		<div class="space-y-2.5">
			{#each data.commitments as c (c.id)}
				<div
					class="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-soft dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none"
				>
					<!-- Tester satiri: kompakt -->
					<div class="flex items-center justify-between gap-3">
						<a
							href="/users/{c.tester.id}"
							class="flex min-w-0 items-center gap-2 text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
						>
							<span class="truncate">{c.tester.firstName}</span>
							{#if c.tester.username}
								<span class="truncate font-mono text-xs font-normal text-zinc-400"
									>@{c.tester.username}</span
								>
							{/if}
						</a>
						<div class="flex shrink-0 items-center gap-2">
							<span class="hidden font-mono text-xs text-zinc-400 sm:inline"
								>{fmt(c.startedAt)}</span
							>
							<StatusBadge tone={commitmentStatusTone(c.status)} label={statusLabel[c.status]()} />
							{#if c.status === 'active'}
								<form
									method="POST"
									action="?/cancelCommitment"
									use:enhance
									onsubmit={(e) => {
										if (!confirm(m.admin_cmt_cancel_confirm())) e.preventDefault();
									}}
								>
									<input type="hidden" name="commitmentId" value={c.id} />
									<button
										type="submit"
										title={m.admin_cmt_cancel_btn()}
										aria-label={m.admin_cmt_cancel_btn()}
										class="inline-flex size-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
									>
										<svg
											class="size-4"
											viewBox="0 0 20 20"
											fill="none"
											stroke="currentColor"
											stroke-width="1.8"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<path d="M6 6l8 8M14 6l-8 8" />
										</svg>
									</button>
								</form>
							{/if}
						</div>
					</div>

					<!-- 3 kontrol noktasi: kompakt yatay serit -->
					<div class="mt-3 grid grid-cols-3 gap-2">
						{#each c.checkpoints as cp (cp.kind)}
							{@const shots = cp.screenshots ?? []}
							<div class="flex items-center gap-2.5 rounded-xl bg-zinc-50 p-2 dark:bg-zinc-950/40">
								<!-- Kanit thumbnail ya da durum yer tutucu -->
								{#if shots.length}
									<button
										type="button"
										onclick={() => (lightbox = { src: shots[0].url, alt: cpKindLabel[cp.kind]() })}
										class="group relative size-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-zinc-200 transition-transform hover:scale-105 dark:ring-zinc-700"
									>
										<img src={shots[0].url} alt="kanit" class="size-full object-cover" />
										{#if shots.length > 1}
											<span
												class="absolute right-0 bottom-0 rounded-tl-md bg-black/60 px-1 font-mono text-[9px] font-semibold text-white"
												>+{shots.length - 1}</span
											>
										{/if}
									</button>
								{:else}
									<span
										class="flex size-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-200 text-zinc-300 dark:border-zinc-700 dark:text-zinc-600"
									>
										<svg
											class="size-4"
											viewBox="0 0 20 20"
											fill="none"
											stroke="currentColor"
											stroke-width="1.6"
											aria-hidden="true"
										>
											<rect x="3" y="3" width="14" height="14" rx="2" />
											<path
												d="M3 13l4-4 3 3 3-3 4 4"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									</span>
								{/if}
								<div class="min-w-0">
									<div class="truncate text-xs font-semibold text-zinc-700 dark:text-zinc-200">
										{cpKindLabel[cp.kind]()}
									</div>
									<div class="mt-0.5">
										<StatusBadge
											tone={cpStatusTone(cp.status)}
											label={cpStatusLabel[cp.status]()}
										/>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>

{#if lightbox}
	<Lightbox src={lightbox.src} alt={lightbox.alt} onclose={() => (lightbox = null)} />
{/if}

{#if showDelete}
	<!-- Uygulama silme onayi + opsiyonel sebep (botu baglamis sahibe DM gider). -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="button"
		tabindex="0"
		onclick={(e) => {
			if (e.target === e.currentTarget) showDelete = false;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') showDelete = false;
		}}
	>
		<div
			class="animate-pop-in w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
		>
			<h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
				{m.admin_app_delete_modal_title({ app: data.appName })}
			</h2>
			<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{m.admin_app_delete_modal_desc()}</p>

			<form method="POST" action="?/deleteApp" use:enhance class="mt-4 space-y-4">
				<div>
					<label
						for="del-reason"
						class="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
					>
						{m.admin_app_delete_reason_label()}
					</label>
					<textarea
						id="del-reason"
						name="reason"
						bind:value={deleteReason}
						rows="3"
						placeholder={m.admin_app_delete_reason_placeholder()}
						class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
					></textarea>
					<p class="mt-1 text-xs text-zinc-400">{m.admin_app_delete_reason_hint()}</p>
				</div>

				<div class="flex justify-end gap-2 pt-1">
					<button
						type="button"
						onclick={() => (showDelete = false)}
						class="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
					>
						{m.admin_broadcast_cancel()}
					</button>
					<button
						type="submit"
						class="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
					>
						{m.admin_app_delete_btn()}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
