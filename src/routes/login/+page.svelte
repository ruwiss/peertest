<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const missingConfig = $derived(!data.botUsername);

	let starting = $state(false);
	let errMsg = $state<string | null>(null);

	async function startBotLogin() {
		starting = true;
		errMsg = null;
		try {
			const res = await fetch('/api/auth/bot-login/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ redirectTo: data.redirectTo })
			});
			if (!res.ok) {
				const b = await res.json().catch(() => ({}));
				throw new Error(b.message ?? 'Token üretilemedi.');
			}
			const json: { deepLink: string } = await res.json();
			// Telegram'i yeni sekmede ac (mobilde uygulama, masaustunde Telegram Desktop/web).
			window.open(json.deepLink, '_blank', 'noopener,noreferrer');
		} catch (e) {
			errMsg = (e as Error).message;
		} finally {
			starting = false;
		}
	}
</script>

<svelte:head>
	<title>{m.page_title_login()} · {m.app_name()}</title>
</svelte:head>

<main class="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
	<!-- Marka gradyani arka plan -->
	<div aria-hidden="true" class="absolute inset-0 -z-10">
		<div class="absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-tg-200/40 blur-3xl dark:bg-tg-500/15"></div>
		<div class="absolute -bottom-32 left-1/3 size-[28rem] rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-500/10"></div>
	</div>

	<div class="w-full max-w-md">
		<a
			href="/"
			class="mb-6 flex items-center justify-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
		>
			<svg class="size-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M12.5 5 7 10l5.5 5" />
			</svg>
			{m.app_name()}
		</a>

		<div class="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
			<div class="mb-6 text-center">
				<div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-tg-50 text-tg-600 dark:bg-tg-500/10 dark:text-tg-300">
					<svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="m22 2-7 20-4-9-9-4 20-7Z" />
						<path d="M22 2 11 13" />
					</svg>
				</div>
				<h1 class="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
					{m.app_name()}
				</h1>
				<p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{m.login_subtitle()}</p>
			</div>

			<ol class="mb-6 space-y-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
				<li class="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
					<span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-tg-100 font-mono text-xs font-semibold text-tg-700 dark:bg-tg-500/20 dark:text-tg-300">1</span>
					<span>{m.bot_login_step_1()}</span>
				</li>
				<li class="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
					<span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-tg-100 font-mono text-xs font-semibold text-tg-700 dark:bg-tg-500/20 dark:text-tg-300">2</span>
					<span>{m.bot_login_step_2()}</span>
				</li>
				<li class="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
					<span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-tg-100 font-mono text-xs font-semibold text-tg-700 dark:bg-tg-500/20 dark:text-tg-300">3</span>
					<span>{m.bot_login_step_3()}</span>
				</li>
			</ol>

			{#if missingConfig}
				<p class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
					{m.login_missing_config()}
				</p>
			{:else}
				<button
					type="button"
					onclick={startBotLogin}
					disabled={starting}
					class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-tg-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-tg-500 disabled:opacity-60"
				>
					<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="m22 2-7 20-4-9-9-4 20-7Z" />
						<path d="M22 2 11 13" />
					</svg>
					{starting ? m.bot_login_starting() : m.bot_login_btn()}
				</button>
				{#if errMsg}
					<p class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
						{errMsg}
					</p>
				{/if}
				<p class="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
					{m.bot_login_hint()}
				</p>
			{/if}

			{#if data.devLoginEnabled}
				<!-- Hizli test girisi (sadece yerel dev + DEV_LOGIN=true). Prod'a sizmaz. -->
				<div class="mt-6 border-t border-dashed border-amber-300 pt-5 dark:border-amber-500/40">
					<div class="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-400">
						<svg class="size-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path fill-rule="evenodd" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm.75 4a.75.75 0 0 0-1.5 0v4c0 .2.08.39.22.53l2.5 2.5a.75.75 0 1 0 1.06-1.06l-2.28-2.28V6Z" clip-rule="evenodd" />
						</svg>
						{m.dev_login_title()}
					</div>
					<form method="GET" action="/api/auth/dev-login" class="space-y-2">
						<div class="grid grid-cols-3 gap-2">
							<label class="col-span-1 block">
								<span class="mb-1 block text-[10px] font-medium text-zinc-500 uppercase dark:text-zinc-400">ID</span>
								<input
									name="id"
									type="number"
									placeholder="999000001"
									value="999000001"
									class="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
								/>
							</label>
							<label class="col-span-2 block">
								<span class="mb-1 block text-[10px] font-medium text-zinc-500 uppercase dark:text-zinc-400">{m.dev_login_username()}</span>
								<input
									name="username"
									type="text"
									placeholder="test_user"
									value="test_user"
									class="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
								/>
							</label>
						</div>
						<label class="block">
							<span class="mb-1 block text-[10px] font-medium text-zinc-500 uppercase dark:text-zinc-400">{m.dev_login_name()}</span>
							<input
								name="name"
								type="text"
								placeholder="Test User"
								value="Test User"
								class="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
							/>
						</label>
						{#if data.redirectTo && data.redirectTo !== '/'}
							<input type="hidden" name="redirectTo" value={data.redirectTo} />
						{/if}
						<button
							type="submit"
							class="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
						>
							{m.dev_login_btn()}
						</button>
						<p class="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
							{m.dev_login_hint()}
						</p>
					</form>
				</div>
			{/if}
		</div>

		<p class="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-500">
			<a href="/how-it-works" class="hover:text-zinc-900 hover:underline dark:hover:text-zinc-200">
				{m.nav_how_it_works()}
			</a>
		</p>
	</div>
</main>
