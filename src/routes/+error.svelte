<script lang="ts">
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import * as m from '$lib/paraglide/messages';

	// Status -> (title, body) eslemesi. Mesaj uzun teknik aciklamalardan korunur.
	const titleFor = $derived(
		page.status === 401
			? m.error_401()
			: page.status === 403
				? m.error_403()
				: page.status === 404
					? m.error_404()
					: page.status === 429
						? m.error_429()
						: page.status === 503
							? m.error_503()
							: page.status >= 500
								? m.error_500()
								: m.error_generic()
	);

	const bodyFor = $derived(
		page.status === 401
			? m.error_401_body()
			: page.status === 403
				? m.error_403_body()
				: page.status === 404
					? m.error_404_body()
					: page.status === 429
						? m.error_429_body()
						: page.status === 503
							? m.error_503_body()
							: page.status >= 500
								? m.error_500_body()
								: m.error_generic_body()
	);

	// SvelteKit'in throw error(status, message) ile gonderdigi backend mesaji
	// teknik veya cok kisa olabilir; sadece title/body ile cakismiyorsa goster.
	const technical = $derived(
		page.error?.message && page.error.message !== titleFor ? page.error.message : null
	);

	async function retry() {
		await invalidateAll();
	}
</script>

<svelte:head><title>{page.status} · {m.app_name()}</title></svelte:head>

<section
	class="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center"
>
	<!-- Buyuk status numarasi -->
	<div class="relative">
		<div class="font-mono text-7xl font-semibold text-zinc-200 sm:text-8xl dark:text-zinc-800">
			{page.status}
		</div>
		<div class="absolute inset-0 -z-10 flex items-center justify-center">
			<div class="size-32 rounded-full bg-tg-500/10 blur-3xl dark:bg-tg-500/15"></div>
		</div>
	</div>

	<h1 class="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
		{titleFor}
	</h1>
	<p class="mt-2.5 text-sm text-zinc-500">{bodyFor}</p>

	{#if technical}
		<details class="mt-3 text-xs text-zinc-400">
			<summary class="cursor-pointer">Teknik detay</summary>
			<p class="mt-1 max-w-md font-mono break-words">{technical}</p>
		</details>
	{/if}

	<div class="mt-6 flex flex-wrap items-center justify-center gap-2">
		{#if page.status === 401}
			<button
				type="button"
				onclick={() => goto(`/login?redirectTo=${encodeURIComponent(page.url.pathname)}`)}
				class="rounded-full bg-tg-600 px-5 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:bg-tg-500 hover:shadow-soft-lg active:scale-95 dark:shadow-none"
			>
				{m.error_login_btn()}
			</button>
		{:else if page.status === 429 || page.status >= 500}
			<button
				type="button"
				onclick={retry}
				class="rounded-full bg-tg-600 px-5 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:bg-tg-500 hover:shadow-soft-lg active:scale-95 dark:shadow-none"
			>
				{m.error_retry()}
			</button>
		{/if}
		<a
			href="/"
			class="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
		>
			{m.error_back_home()}
		</a>
	</div>
</section>
