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
	const saved = $derived(form && 'success' in form);

	let reporting = $state<string | null>(null);
	let lightbox = $state<{ src: string; alt: string } | null>(null);

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

<svelte:head><title>{m.my_app_testers_title({ app: data.appName })}</title></svelte:head>

<section class="mx-auto max-w-4xl px-4 py-6 sm:py-10">
	<div class="mb-5">
		<BackLink href="/my-apps" label={m.my_app_back()} />
	</div>
	<h1 class="mb-6 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">
		{m.my_app_testers_title({ app: data.appName })}
	</h1>

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
			{m.my_app_report_sent()}
		</p>
	{/if}

	{#if data.commitments.length === 0}
		<p
			class="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800"
		>
			{m.my_app_empty_testers()}
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
						</div>
					</div>

					<!-- 3 kontrol noktasi: kompakt yatay serit -->
					<div class="mt-3 grid grid-cols-3 gap-2">
						{#each c.checkpoints as cp (cp.kind)}
							{@const shots = cp.screenshots ?? []}
							<div class="flex items-center gap-2.5 rounded-xl bg-zinc-50 p-2 dark:bg-zinc-950/40">
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

					<!-- Aksiyon: sikayet / cikar -->
					<div class="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
						{#if reporting === c.id}
							<form
								method="POST"
								action="?/report"
								use:enhance={() =>
									async ({ result, update }) => {
										await update();
										if (result.type === 'success') reporting = null;
									}}
							>
								<input type="hidden" name="commitmentId" value={c.id} />
								<textarea
									name="reason"
									rows="2"
									required
									placeholder={m.my_app_report_placeholder()}
									class="w-full rounded-lg border border-zinc-200 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
								></textarea>
								<div class="mt-2 flex flex-wrap gap-2">
									<button
										class="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500"
										type="submit">{m.my_app_report_send()}</button
									>
									<button
										type="button"
										onclick={() => (reporting = null)}
										class="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700"
										>{m.my_app_report_cancel()}</button
									>
								</div>
							</form>
						{:else}
							<div class="flex flex-wrap items-center gap-4">
								<button
									onclick={() => (reporting = c.id)}
									class="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
								>
									{m.my_app_report_btn()}
								</button>
								<!-- Kanit gonderildikten sonra owner da cikaramaz (server kilitli). -->
								{#if c.status === 'active' && !c.checkpoints.some((cp) => cp.status === 'submitted')}
									<form
										method="POST"
										action="?/remove"
										use:enhance
										onsubmit={(e) => {
											if (!confirm(m.my_app_remove_confirm())) e.preventDefault();
										}}
									>
										<input type="hidden" name="commitmentId" value={c.id} />
										<button type="submit" class="text-xs font-medium text-zinc-500 hover:underline">
											{m.my_app_remove_btn()}
										</button>
									</form>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>

{#if lightbox}
	<Lightbox src={lightbox.src} alt={lightbox.alt} onclose={() => (lightbox = null)} />
{/if}
