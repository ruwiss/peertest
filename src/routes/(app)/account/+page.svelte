<script lang="ts">
	import { enhance } from '$app/forms';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const user = $derived(data.user!);

	let avatarBusy = $state(false);
	let avatarError = $state<string | null>(null);
	let avatarFormEl = $state<HTMLFormElement>();
	let avatarHiddenInput = $state<HTMLInputElement>();
	let fileInputEl = $state<HTMLInputElement>();
	let menuOpen = $state(false);
	const avatarErrorFromAction = $derived(
		form && 'message' in form ? (form.message as string) : null
	);

	async function readImageDims(file: File): Promise<{ w: number; h: number }> {
		const url = URL.createObjectURL(file);
		try {
			return await new Promise<{ w: number; h: number }>((resolve, reject) => {
				const img = new Image();
				img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
				img.onerror = () => reject(new Error('image decode failed'));
				img.src = url;
			});
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	async function uploadAndSave(file: File | null | undefined) {
		menuOpen = false;
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			avatarError = m.upload_invalid_type();
			return;
		}
		avatarBusy = true;
		avatarError = null;
		try {
			const dims = await readImageDims(file);
			const fd = new FormData();
			fd.append('image', file);
			fd.append('width', String(dims.w));
			fd.append('height', String(dims.h));
			const res = await fetch('/api/upload', { method: 'POST', body: fd });
			if (!res.ok) {
				const b = await res.json().catch(() => ({}));
				throw new Error(b.message ?? m.upload_failed());
			}
			const body = (await res.json()) as { url: string };
			// Hidden input degerini yaz + form'u submit et (use:enhance ile data refresh).
			if (avatarHiddenInput) avatarHiddenInput.value = body.url;
			avatarFormEl?.requestSubmit();
		} catch (e) {
			avatarError = (e as Error).message;
			avatarBusy = false;
		}
	}

	function removeAvatar() {
		menuOpen = false;
		avatarBusy = true;
		avatarError = null;
		if (avatarHiddenInput) avatarHiddenInput.value = '';
		avatarFormEl?.requestSubmit();
	}

	const reasonLabel: Record<string, () => string> = {
		checkpoint_missed: m.reason_checkpoint_missed,
		commitment_completed: m.reason_commitment_completed,
		admin_penalty: m.reason_admin_penalty,
		admin_reward: m.reason_admin_reward,
		report_penalty: m.reason_report_penalty
	};

	function fmt(d: Date | string): string {
		return new Intl.DateTimeFormat(getLocale() === 'en' ? 'en-US' : 'tr-TR', {
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(d));
	}

	function fmtDate(d: Date | string | null): string {
		if (!d) return '—';
		return new Intl.DateTimeFormat(getLocale() === 'en' ? 'en-US' : 'tr-TR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		}).format(new Date(d));
	}
</script>

<svelte:head>
	<title>{m.account_title()} · {m.app_name()}</title>
</svelte:head>

<section class="mx-auto max-w-5xl px-4 py-6 sm:py-10">
	<!-- Profile hero: avatar banner ustune oturuyor, isim banner'in altinda kaliyor -->
	<div class="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
		<div class="h-20 bg-gradient-to-br from-tg-500 via-tg-600 to-tg-700 sm:h-24"></div>
		<div class="px-4 pb-5 sm:px-6">
			<div class="flex flex-wrap items-end justify-between gap-3">
				<!-- Avatar + duzenle menusu (kamera ikonlu kucuk buton) -->
				<div class="relative -mt-10 shrink-0">
					{#if user.avatarUrl}
						<img
							src={user.avatarUrl}
							alt=""
							class="size-16 rounded-2xl border-4 border-white object-cover shadow-sm sm:size-20 dark:border-zinc-900"
						/>
					{:else}
						<div
							class="flex size-16 items-center justify-center rounded-2xl border-4 border-white bg-zinc-100 text-2xl font-semibold text-zinc-500 sm:size-20 dark:border-zinc-900 dark:bg-zinc-800 dark:text-zinc-300"
						>
							{user.firstName.charAt(0)}
						</div>
					{/if}

					<!-- Kamera (duzenle) butonu - sag alt kose -->
					<button
						type="button"
						onclick={() => (menuOpen = !menuOpen)}
						disabled={avatarBusy}
						aria-label={m.account_avatar_edit()}
						aria-expanded={menuOpen}
						class="absolute -right-1 -bottom-1 inline-flex size-7 items-center justify-center rounded-full border-2 border-white bg-tg-600 text-white shadow-md transition-colors hover:bg-tg-500 disabled:opacity-60 dark:border-zinc-900"
					>
						{#if avatarBusy}
							<svg class="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M21 12a9 9 0 1 1-6.219-8.56" />
							</svg>
						{:else}
							<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
								<circle cx="12" cy="13" r="4" />
							</svg>
						{/if}
					</button>

					<!-- Acilir menu: yukle / kaldir -->
					{#if menuOpen}
						<div
							role="menu"
							class="absolute top-full left-0 z-20 mt-2 w-44 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
						>
							<button
								type="button"
								onclick={() => fileInputEl?.click()}
								class="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
							>
								<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
									<polyline points="17 8 12 3 7 8" />
									<line x1="12" y1="3" x2="12" y2="15" />
								</svg>
								{user.avatarUrl ? m.account_avatar_replace() : m.account_avatar_upload()}
							</button>
							{#if user.avatarUrl}
								<button
									type="button"
									onclick={removeAvatar}
									class="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
								>
									<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
										<polyline points="3 6 5 6 21 6" />
										<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
									</svg>
									{m.account_avatar_remove()}
								</button>
							{/if}
						</div>
					{/if}

					<!-- Gizli dosya secici + use:enhance form (avatar yukleme sonrasi submit ediyor) -->
					<input
						bind:this={fileInputEl}
						type="file"
						accept="image/*"
						class="hidden"
						onchange={(e) => uploadAndSave((e.currentTarget as HTMLInputElement).files?.[0])}
					/>
					<form
						bind:this={avatarFormEl}
						method="POST"
						action="?/updateAvatar"
						use:enhance={() =>
							async ({ result, update }) => {
								await update();
								avatarBusy = false;
								if (result.type !== 'success') {
									avatarError = m.upload_failed();
								}
							}}
					>
						<input bind:this={avatarHiddenInput} type="hidden" name="avatarUrl" value="" />
					</form>
				</div>

				<form method="POST" action="/api/auth/logout" class="ml-auto">
					<button
						type="submit"
						class="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
					>
						{m.logout()}
					</button>
				</form>
			</div>

			{#if avatarError || avatarErrorFromAction}
				<p class="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
					{avatarError ?? avatarErrorFromAction}
				</p>
			{/if}
			<div class="mt-3">
				<h1 class="truncate text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
					{user.firstName}
				</h1>
				{#if user.username}
					<div class="truncate font-mono text-sm text-zinc-500">@{user.username}</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Stat grid -->
	<div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
		<div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
			<div class="text-xs text-zinc-500">{m.account_field_score()}</div>
			<div class="mt-1 flex items-baseline gap-1">
				<span class="font-mono text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{user.score}</span>
			</div>
		</div>
		<div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
			<div class="text-xs text-zinc-500">{m.profile_completed()}</div>
			<div class="mt-1 font-mono text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{data.completedCount}</div>
		</div>
		<div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
			<div class="text-xs text-zinc-500">{m.account_field_bot()}</div>
			<div class="mt-1 flex items-center gap-1.5">
				{#if user.botStarted}
					<span class="size-1.5 rounded-full bg-emerald-500"></span>
					<span class="text-sm font-medium text-emerald-700 dark:text-emerald-400">{m.yes()}</span>
				{:else}
					<a
						href="/connect-bot"
						class="text-sm font-medium text-tg-700 hover:underline dark:text-tg-300"
					>
						{m.connect_bot()}
					</a>
				{/if}
			</div>
		</div>
		<div class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
			<div class="text-xs text-zinc-500">{m.profile_member_since()}</div>
			<div class="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{fmtDate(data.memberSince)}</div>
		</div>
	</div>

	<!-- Score history -->
	<div class="mt-8">
		<h2 class="mb-3 text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
			{m.account_history_title()}
		</h2>
		{#if data.events.length === 0}
			<div
				class="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800"
			>
				{m.account_history_empty()}
			</div>
		{:else}
			<div class="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
				<ul class="divide-y divide-zinc-100 dark:divide-zinc-800">
					{#each data.events as e (e.id)}
						<li class="flex items-center gap-4 px-4 py-3 text-sm">
							<div
								class="flex size-8 shrink-0 items-center justify-center rounded-full {e.delta < 0
									? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
									: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'}"
							>
								{#if e.delta < 0}
									<svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
										<path d="M5 12a1 1 0 1 0 0 2h10a1 1 0 1 0 0-2H5Z" />
									</svg>
								{:else}
									<svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
										<path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
									</svg>
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<div class="truncate text-zinc-900 dark:text-zinc-100">
									{reasonLabel[e.reason]?.() ?? e.reason}
								</div>
								<div class="truncate font-mono text-xs text-zinc-400">
									{fmt(e.createdAt)}{#if e.note} · {e.note}{/if}
								</div>
							</div>
							<div
								class="shrink-0 font-mono text-sm font-semibold {e.delta < 0
									? 'text-red-600 dark:text-red-400'
									: 'text-emerald-600 dark:text-emerald-400'}"
							>
								{e.delta > 0 ? '+' : ''}{e.delta}
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</section>
