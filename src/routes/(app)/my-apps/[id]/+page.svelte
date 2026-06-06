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

<section class="mx-auto max-w-5xl px-4 py-6 sm:py-8">
	<div class="mb-4">
		<BackLink href="/my-apps" label={m.my_app_back()} />
	</div>
	<h1 class="mb-6 text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl dark:text-zinc-100">
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
		<div class="space-y-3">
			{#each data.commitments as c (c.id)}
				<div
					class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
				>
					<!-- Tester satiri -->
					<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
						<a
							href="/users/{c.tester.id}"
							class="flex items-center gap-2 text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
						>
							{c.tester.firstName}
							{#if c.tester.username}
								<span class="font-mono text-xs text-zinc-400">@{c.tester.username}</span>
							{/if}
						</a>
						<div class="flex items-center gap-2">
							<span class="font-mono text-xs text-zinc-400">{fmt(c.startedAt)}</span>
							<StatusBadge tone={commitmentStatusTone(c.status)} label={statusLabel[c.status]()} />
						</div>
					</div>

					<!-- 3 checkpoint kart: kanit + durum -->
					<div class="grid gap-2 sm:grid-cols-3">
						{#each c.checkpoints as cp (cp.kind)}
							<div
								class="rounded-lg border border-zinc-200 bg-zinc-50/40 p-3 dark:border-zinc-800 dark:bg-zinc-950/30"
							>
								<div class="mb-2 flex items-center justify-between gap-2">
									<span class="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
										{cpKindLabel[cp.kind]()}
									</span>
									<StatusBadge tone={cpStatusTone(cp.status)} label={cpStatusLabel[cp.status]()} />
								</div>
								{#if cp.submittedAt}
									<div class="font-mono text-[10px] text-zinc-400">{fmt(cp.submittedAt)}</div>
								{/if}
								{#if cp.screenshots?.length}
									<div class="mt-2 flex flex-wrap gap-1.5">
										{#each cp.screenshots as s, i (i)}
											<button
												type="button"
												onclick={() => (lightbox = { src: s.url, alt: cpKindLabel[cp.kind]() })}
												class="group relative overflow-hidden rounded-md border border-zinc-200 transition-transform hover:scale-105 dark:border-zinc-700"
											>
												<img
													src={s.url}
													alt="kanit"
													class="size-16 object-cover sm:size-20"
												/>
												<span class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
													<svg class="size-5 text-white opacity-0 transition-opacity group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
														<circle cx="11" cy="11" r="8" />
														<line x1="21" y1="21" x2="16.65" y2="16.65" />
														<line x1="11" y1="8" x2="11" y2="14" />
														<line x1="8" y1="11" x2="14" y2="11" />
													</svg>
												</span>
											</button>
										{/each}
									</div>
								{:else}
									<div class="mt-2 text-xs text-zinc-400">{m.admin_app_proof_pending()}</div>
								{/if}
							</div>
						{/each}
					</div>

					<!-- Aksiyon: sikayet / cikar -->
					<div class="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
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
