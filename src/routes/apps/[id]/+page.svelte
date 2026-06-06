<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import * as m from '$lib/paraglide/messages';
	import type { PageData } from './$types';
	import SlotPips from '$lib/components/SlotPips.svelte';
	import ScoreBadge from '$lib/components/ScoreBadge.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import BackLink from '$lib/components/BackLink.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { appStatusTone } from '$lib/utils/status';

	let { data }: { data: PageData } = $props();

	const statusLabel: Record<string, () => string> = {
		active: m.app_status_active,
		frozen: m.app_status_frozen,
		closed: m.app_status_closed
	};

	const canJoin = $derived(
		data.loggedIn &&
			data.botStarted &&
			!data.access.isOwner &&
			data.access.joinedStatus === null &&
			data.app.status === 'active' &&
			data.app.free > 0
	);
	// Giris yapmis ama bot baglanmamis: bilgilendirme banner'i + butonu yonlendir.
	const needsBot = $derived(
		data.loggedIn && !data.botStarted && !data.access.isOwner && data.access.joinedStatus === null
	);

	let joining = $state(false);
	let joinError = $state<string | null>(null);
	let confirming = $state(false);
	// Modal step: 'choose' (mode), 'pick' (offered app), 'warn' (final warning)
	let step = $state<'choose' | 'pick' | 'warn'>('choose');
	let mode = $state<'free' | 'reciprocal'>('free');
	let offeredAppId = $state<string>('');
	let matchedResult = $state<{ trade: { matched: boolean; tradeId: string } } | null>(null);

	const hasOwnApps = $derived(data.myOwnApps && data.myOwnApps.length > 0);
	// Sahip zaten bana trade istegi gondermisse: secim/tabaka sormayalim.
	// Onun bekledigi app'i offered yapip dogrudan onay adimina geciyoruz - kabul = match.
	const hasIncomingTrade = $derived(data.pendingIncomingTrade !== null);

	function openModal() {
		joinError = null;
		matchedResult = null;
		if (hasIncomingTrade && data.pendingIncomingTrade) {
			// Bekleyen istek var: mod = reciprocal, offered = sahibin istedigi app, dogrudan uyari.
			mode = 'reciprocal';
			offeredAppId = data.pendingIncomingTrade.targetAppId;
			step = 'warn';
		} else {
			step = 'choose';
			mode = 'free';
			offeredAppId = data.myOwnApps?.[0]?.id ?? '';
		}
		confirming = true;
	}

	function next() {
		if (step === 'choose') {
			if (mode === 'reciprocal') {
				step = 'pick';
			} else {
				step = 'warn';
			}
		} else if (step === 'pick') {
			if (!offeredAppId) {
				joinError = m.join_error_pick_app();
				return;
			}
			step = 'warn';
		}
	}

	function back() {
		if (step === 'warn' && mode === 'reciprocal') step = 'pick';
		else if (step === 'warn') step = 'choose';
		else if (step === 'pick') step = 'choose';
	}

	async function confirmJoin() {
		joining = true;
		joinError = null;
		try {
			const body =
				mode === 'reciprocal'
					? { appId: data.app.id, mode: 'reciprocal', offeredAppId }
					: { appId: data.app.id, mode: 'free' };
			const res = await fetch('/api/commitments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const b = await res.json().catch(() => ({}));
				throw new Error(b.message ?? m.upload_failed());
			}
			const json = await res.json().catch(() => ({}));

			if (mode === 'reciprocal' && !json.trade?.matched) {
				// Eslesme henuz yok; mesaj goster ve sayfayi tazele.
				matchedResult = json;
				joining = false;
				await invalidateAll();
				return;
			}
			// Karsiliksiz join veya match → /commitments'a git.
			confirming = false;
			await goto('/commitments', { invalidateAll: true });
		} catch (e) {
			joinError = (e as Error).message;
			joining = false;
		}
	}

	function closeModal() {
		if (joining) return;
		confirming = false;
		matchedResult = null;
		step = 'choose';
		joinError = null;
	}
</script>

<svelte:head>
	<title>{data.app.name} · {m.app_name()}</title>
</svelte:head>

<section class="mx-auto max-w-5xl px-4 py-6 sm:py-8">
	<div class="mb-4">
		<BackLink href="/" label={m.app_detail_back()} />
	</div>

	<div
		class="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900 {data
			.app.dim
			? 'opacity-80'
			: ''}"
	>
		<!-- Ust kisim: ikon + ad + paket -->
		<div class="flex flex-wrap items-start gap-3 sm:gap-4">
			{#if data.app.iconUrl}
				<img src={data.app.iconUrl} alt="" class="size-14 shrink-0 rounded-2xl object-cover sm:size-16" />
			{:else}
				<div
					class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-xl font-semibold text-zinc-400 sm:size-16 dark:bg-zinc-800"
				>
					{data.app.name.charAt(0)}
				</div>
			{/if}

			<div class="min-w-0 flex-1">
				<h1 class="truncate text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl dark:text-zinc-100">
					{data.app.name}
				</h1>
				{#if data.app.summary}
					<p class="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{data.app.summary}</p>
				{/if}
				{#if data.app.category}
					<div class="mt-1 text-xs text-zinc-500">{data.app.category}</div>
				{/if}
				{#if data.app.packageName}
					<div class="mt-0.5 truncate font-mono text-xs text-zinc-400">{data.app.packageName}</div>
				{/if}
			</div>

			<StatusBadge tone={appStatusTone(data.app.status)} label={statusLabel[data.app.status]()} />
		</div>

		<!-- Sahip + slot -->
		<div
			class="mt-5 grid grid-cols-1 gap-4 border-t border-zinc-100 pt-4 text-sm sm:grid-cols-2 dark:border-zinc-800"
		>
			<div>
				<div class="mb-1 text-xs text-zinc-400 uppercase">{m.app_detail_owner_label()}</div>
				<a
					href="/users/{data.owner.id}"
					class="group flex items-center gap-2 rounded-md transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
				>
					{#if data.owner.avatarUrl}
						<img src={data.owner.avatarUrl} alt="" class="size-6 rounded-full" />
					{:else}
						<span
							class="flex size-6 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200"
						>
							{data.owner.firstName.charAt(0)}
						</span>
					{/if}
					<span class="text-zinc-700 group-hover:underline dark:text-zinc-200">{data.owner.firstName}</span>
					<ScoreBadge score={data.owner.score} dimBelow={data.dimBelow} />
				</a>
			</div>
			<div>
				<div class="mb-1 text-xs text-zinc-400 uppercase">{m.app_detail_slots_label()}</div>
				<SlotPips filled={data.app.filled} total={data.app.slotsTotal} size="lg" />
			</div>
		</div>

		<!-- Aksiyon: Katil / Zaten katildin / Play Store -->
		<div
			class="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-5 sm:gap-3 dark:border-zinc-800"
		>
			{#if data.access.isOwner}
				<a
					href="/my-apps/{data.app.id}"
					class="rounded-lg bg-tg-600 px-4 py-2 text-sm font-medium text-white hover:bg-tg-500"
				>
					{m.my_apps_testers_link()}
				</a>
			{:else if data.access.joinedStatus === 'completed'}
				<span class="text-sm font-medium text-emerald-600 dark:text-emerald-400">
					✓ {m.app_detail_already_joined_completed()}
				</span>
			{:else if data.access.joinedStatus === 'active'}
				<a
					href="/commitments"
					class="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
				>
					✓ {m.app_detail_already_joined()}
				</a>
			{:else if !data.loggedIn}
				<a
					href="/login"
					class="rounded-lg bg-tg-600 px-4 py-2 text-sm font-medium text-white hover:bg-tg-500"
				>
					{m.login()}
				</a>
			{:else if needsBot}
				<a
					href="/connect-bot?redirectTo={encodeURIComponent(`/apps/${data.app.id}`)}"
					class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
				>
					{m.app_connect_bot_first()}
				</a>
			{:else if canJoin}
				<button
					type="button"
					onclick={openModal}
					class="inline-flex items-center gap-1.5 rounded-lg bg-tg-600 px-4 py-2 text-sm font-medium text-white hover:bg-tg-500"
				>
					{#if hasIncomingTrade}
						<Icon name="swap" class="size-4" />
						{m.app_accept_trade()}
					{:else}
						{m.app_join()}
					{/if}
				</button>
			{/if}

			<!-- 2 asamali akis: 1) Groups, 2) Play Store. Yalniz erisim varsa acilir. -->
			{#if data.access.groupLink}
				<a
					href={data.access.groupLink}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2 rounded-lg bg-tg-50 px-3 py-2 text-sm font-medium text-tg-700 ring-1 ring-tg-200 ring-inset hover:bg-tg-100 sm:px-4 dark:bg-tg-500/10 dark:text-tg-300 dark:ring-tg-500/30 dark:hover:bg-tg-500/20"
				>
					<span class="font-mono text-xs">1</span>
					<span class="hidden sm:inline">{m.step_groups()}</span>
					<span class="sm:hidden">Groups</span>
				</a>
			{/if}

			{#if data.access.appLink}
				<a
					href={data.access.appLink}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 sm:px-4 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
				>
					<span class="font-mono text-xs">2</span>
					<span class="hidden sm:inline">{m.step_play_store()}</span>
					<span class="sm:hidden">Play Store</span>
				</a>
			{:else}
				<span
					class="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-400 sm:px-4 dark:border-zinc-700"
					title={m.app_detail_play_link_locked()}
				>
					<Icon name="lock" class="size-4" />
					<span class="hidden sm:inline">{m.step_play_store()}</span>
					<span class="sm:hidden">Play Store</span>
				</span>
			{/if}
		</div>

		{#if !data.access.hasAccess && data.loggedIn}
			<p class="mt-3 text-xs text-zinc-500">
				{m.app_detail_play_link_locked()}
			</p>
		{/if}

		{#if hasIncomingTrade && data.pendingIncomingTrade && canJoin}
			<!-- Sahip bana bu app icin trade teklifi acmis. Modal'i kisaltacagiz. -->
			<div class="mt-4 flex items-start gap-3 rounded-xl border border-tg-200 bg-tg-50 p-4 text-sm dark:border-tg-500/30 dark:bg-tg-500/10">
				<span class="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-tg-100 text-tg-700 dark:bg-tg-500/20 dark:text-tg-300">
					<Icon name="swap" class="size-4" />
				</span>
				<div class="min-w-0 flex-1">
					<div class="font-medium text-tg-900 dark:text-tg-200">
						{m.app_incoming_trade_title({ owner: data.owner.firstName })}
					</div>
					<p class="mt-1 text-xs leading-relaxed text-tg-800 dark:text-tg-300/90">
						{m.app_incoming_trade_body({
							owner: data.owner.firstName,
							yourApp: data.pendingIncomingTrade.targetAppName
						})}
					</p>
				</div>
			</div>
		{/if}

		<!-- Aciklama (sahip yazdiysa) -->
		{#if data.app.description?.trim()}
			<div class="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800">
				<h2 class="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
					{m.app_detail_description_heading()}
				</h2>
				<p class="text-sm whitespace-pre-line text-zinc-600 dark:text-zinc-300">
					{data.app.description}
				</p>
			</div>
		{/if}
	</div>
</section>

<!-- Katilma onay modali (cok adimli) -->
{#if confirming}
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) closeModal();
		}}
	>
		<div
			class="w-full max-w-md rounded-t-2xl border border-zinc-200 bg-white p-5 sm:rounded-xl sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
		>
			{#if matchedResult && !matchedResult.trade?.matched}
				<!-- Trade istegi gonderildi, eslesme yok -->
				<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
					{m.trade_pending_title()}
				</h2>
				<p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
					{m.trade_pending_body({ owner: data.owner.firstName })}
				</p>
				<div class="mt-5 flex justify-end">
					<button
						type="button"
						onclick={closeModal}
						class="rounded-lg bg-tg-600 px-4 py-2 text-sm font-medium text-white hover:bg-tg-500"
					>
						{m.trade_pending_close()}
					</button>
				</div>
			{:else if step === 'choose'}
				<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
					{m.join_dialog_title({ app: data.app.name })}
				</h2>
				<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{m.join_mode_helper()}</p>

				<div class="mt-4 space-y-2.5">
					<!-- Karsilikli secenegi -->
					<label
						class="flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors {mode ===
						'reciprocal'
							? 'border-tg-500 bg-tg-50/50 dark:border-tg-500/50 dark:bg-tg-500/10'
							: 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50'} {!hasOwnApps
							? 'cursor-not-allowed opacity-50'
							: ''}"
					>
						<input
							type="radio"
							bind:group={mode}
							value="reciprocal"
							disabled={!hasOwnApps}
							class="mt-0.5 accent-tg-600"
						/>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
								<span class="inline-flex size-6 items-center justify-center rounded-md bg-tg-100 text-tg-700 dark:bg-tg-500/20 dark:text-tg-300">
									<Icon name="swap" class="size-3.5" />
								</span>
								{m.join_mode_reciprocal()}
							</div>
							<p class="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
								{m.join_mode_reciprocal_desc()}
							</p>
							{#if !hasOwnApps}
								<p class="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
									{m.join_mode_reciprocal_disabled()}
								</p>
							{/if}
						</div>
					</label>

					<!-- Karsiliksiz secenegi -->
					<label
						class="flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors {mode ===
						'free'
							? 'border-tg-500 bg-tg-50/50 dark:border-tg-500/50 dark:bg-tg-500/10'
							: 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50'}"
					>
						<input type="radio" bind:group={mode} value="free" class="mt-0.5 accent-tg-600" />
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
								<span class="inline-flex size-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
									<Icon name="handshake" class="size-3.5" />
								</span>
								{m.join_mode_free()}
							</div>
							<p class="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
								{m.join_mode_free_desc()}
							</p>
						</div>
					</label>
				</div>

				<div class="mt-5 flex flex-wrap justify-end gap-2">
					<button
						type="button"
						onclick={closeModal}
						class="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
					>
						{m.join_cta_cancel()}
					</button>
					<button
						type="button"
						onclick={next}
						class="rounded-lg bg-tg-600 px-4 py-2 text-sm font-medium text-white hover:bg-tg-500"
					>
						{m.join_continue()}
					</button>
				</div>
			{:else if step === 'pick'}
				<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
					{m.join_pick_title()}
				</h2>
				<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{m.join_pick_helper()}</p>

				<div class="mt-4 max-h-60 space-y-2 overflow-y-auto">
					{#each data.myOwnApps as a (a.id)}
						<label
							class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors {offeredAppId ===
							a.id
								? 'border-tg-500 bg-tg-50/50 dark:border-tg-500/50 dark:bg-tg-500/10'
								: 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50'}"
						>
							<input
								type="radio"
								bind:group={offeredAppId}
								value={a.id}
								class="accent-tg-600"
							/>
							{#if a.iconUrl}
								<img src={a.iconUrl} alt="" class="size-8 shrink-0 rounded-md object-cover" />
							{:else}
								<div
									class="flex size-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-sm font-semibold text-zinc-400 dark:bg-zinc-800"
								>
									{a.name.charAt(0)}
								</div>
							{/if}
							<span class="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{a.name}</span>
						</label>
					{/each}
				</div>

				{#if joinError}
					<p class="mt-3 text-sm text-red-600 dark:text-red-400">{joinError}</p>
				{/if}

				<div class="mt-5 flex flex-wrap justify-between gap-2">
					<button
						type="button"
						onclick={back}
						class="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
					>
						← {m.join_back()}
					</button>
					<button
						type="button"
						onclick={next}
						class="rounded-lg bg-tg-600 px-4 py-2 text-sm font-medium text-white hover:bg-tg-500"
					>
						{m.join_continue()}
					</button>
				</div>
			{:else if step === 'warn'}
				<h2 class="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
					{#if hasIncomingTrade}
						<span class="inline-flex size-7 items-center justify-center rounded-lg bg-tg-100 text-tg-700 dark:bg-tg-500/20 dark:text-tg-300">
							<Icon name="swap" class="size-4" />
						</span>
						{m.app_accept_trade()}
					{:else}
						{m.join_dialog_title({ app: data.app.name })}
					{/if}
				</h2>

				{#if hasIncomingTrade && data.pendingIncomingTrade}
					<!-- Incoming trade -> ikili eslesme ozeti -->
					<div class="mt-3 rounded-xl border border-tg-200 bg-tg-50/60 p-3 text-xs leading-relaxed text-tg-900 dark:border-tg-500/30 dark:bg-tg-500/10 dark:text-tg-200">
						<div class="flex items-center justify-between gap-2">
							<div class="min-w-0 flex-1">
								<div class="text-[10px] font-medium tracking-wide text-tg-700 uppercase dark:text-tg-300">{m.join_trade_summary_youll_test()}</div>
								<div class="truncate font-medium">{data.app.name}</div>
							</div>
							<span class="text-base">↔</span>
							<div class="min-w-0 flex-1 text-right">
								<div class="text-[10px] font-medium tracking-wide text-tg-700 uppercase dark:text-tg-300">{m.join_trade_summary_theyll_test()}</div>
								<div class="truncate font-medium">{data.pendingIncomingTrade.targetAppName}</div>
							</div>
						</div>
					</div>
				{/if}

				<div
					class="mt-4 space-y-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
				>
					<p class="font-medium">{m.join_warning_heading()}</p>
					<ul class="list-inside list-disc space-y-1">
						<li>{m.join_warning_li_1()}</li>
						<li>{m.join_warning_li_2()}</li>
						<li>{m.join_warning_li_3()}</li>
					</ul>
				</div>
				{#if joinError}
					<p class="mt-3 text-sm text-red-600 dark:text-red-400">{joinError}</p>
				{/if}
				<div class="mt-5 flex flex-wrap justify-between gap-2">
					{#if hasIncomingTrade}
						<!-- Incoming trade'de geri yok; sadece iptal -->
						<button
							type="button"
							onclick={closeModal}
							disabled={joining}
							class="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
						>
							{m.join_cta_cancel()}
						</button>
					{:else}
						<button
							type="button"
							onclick={back}
							disabled={joining}
							class="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
						>
							← {m.join_back()}
						</button>
					{/if}
					<button
						type="button"
						onclick={confirmJoin}
						disabled={joining}
						class="rounded-lg bg-tg-600 px-4 py-2 text-sm font-medium text-white hover:bg-tg-500 disabled:opacity-50"
					>
						{joining ? m.join_cta_pending() : hasIncomingTrade ? m.join_cta_match() : m.join_cta_confirm()}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
