<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale, setLocale, locales } from '$lib/paraglide/runtime';

	interface MenuUser {
		firstName: string;
		username: string | null;
		avatarUrl: string | null;
	}
	let { user }: { user: MenuUser } = $props();

	type ThemeMode = 'system' | 'light' | 'dark';
	let open = $state(false);
	let mode = $state<ThemeMode>('system');
	let dark = $state(false);
	let rootEl = $state<HTMLDivElement>();
	const activeLocale = getLocale();

	onMount(() => {
		try {
			const t = localStorage.getItem('theme');
			mode = t === 'dark' ? 'dark' : t === 'light' ? 'light' : 'system';
		} catch {
			mode = 'system';
		}
		dark = document.documentElement.classList.contains('dark');
	});

	function applyTheme(next: ThemeMode) {
		mode = next;
		try {
			if (next === 'system') localStorage.removeItem('theme');
			else localStorage.setItem('theme', next);
		} catch {
			// sessiz
		}
		const systemDark = matchMedia('(prefers-color-scheme: dark)').matches;
		dark = next === 'dark' || (next === 'system' && systemDark);
		document.documentElement.classList.toggle('dark', dark);
	}

	function onWindowClick(e: MouseEvent) {
		if (!open) return;
		const target = e.target as Node | null;
		if (rootEl && target && !rootEl.contains(target)) open = false;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={onKey} />

<div bind:this={rootEl} class="relative">
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-haspopup="menu"
		aria-expanded={open}
		class="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-1 py-1 pr-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
	>
		{#if user.avatarUrl}
			<img src={user.avatarUrl} alt="" class="size-7 shrink-0 rounded-full" />
		{:else}
			<span
				class="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200"
			>
				{user.firstName.charAt(0)}
			</span>
		{/if}
		<span class="hidden max-w-[8rem] truncate sm:inline">{user.firstName}</span>
		<svg
			class="size-3.5 text-zinc-400 transition-transform {open ? 'rotate-180' : ''}"
			viewBox="0 0 20 20"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				fill-rule="evenodd"
				d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
				clip-rule="evenodd"
			/>
		</svg>
	</button>

	{#if open}
		<div
			role="menu"
			class="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-xl border border-zinc-200 bg-white p-1 shadow-lg ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/5"
		>
			<!-- User block -->
			<a
				href="/account"
				onclick={() => (open = false)}
				role="menuitem"
				class="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800"
			>
				{#if user.avatarUrl}
					<img src={user.avatarUrl} alt="" class="size-10 shrink-0 rounded-full" />
				{:else}
					<span
						class="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200"
					>
						{user.firstName.charAt(0)}
					</span>
				{/if}
				<div class="min-w-0 flex-1">
					<div class="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
						{user.firstName}
					</div>
					{#if user.username}
						<div class="truncate font-mono text-xs text-zinc-500">@{user.username}</div>
					{/if}
				</div>
				<svg
					class="size-4 text-zinc-400"
					viewBox="0 0 20 20"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						fill-rule="evenodd"
						d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.05 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.39 4.25a.75.75 0 0 1 0 1.08l-4.39 4.25a.75.75 0 0 1-1.06-.02Z"
						clip-rule="evenodd"
					/>
				</svg>
			</a>

			<div class="my-1 h-px bg-zinc-100 dark:bg-zinc-800"></div>

			<!-- Theme mode picker: 3 li grup (sistem/aciksiyah/koyu) -->
			<div
				class="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300"
			>
				<span class="flex items-center gap-2.5">
					{#if dark}
						<svg
							class="size-4 text-amber-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="1.8"
							aria-hidden="true"
						>
							<circle cx="12" cy="12" r="4" />
							<path
								stroke-linecap="round"
								d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41"
							/>
						</svg>
					{:else}
						<svg
							class="size-4 text-zinc-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="1.8"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
							/>
						</svg>
					{/if}
					{m.theme_toggle()}
				</span>
				<div class="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
					<button
						type="button"
						onclick={() => applyTheme('system')}
						aria-label={m.theme_system()}
						title={m.theme_system()}
						class="rounded-md p-1 transition-colors {mode === 'system'
							? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
							: 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'}"
					>
						<svg
							class="size-3.5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
							aria-hidden="true"
						>
							<rect x="3" y="4" width="18" height="12" rx="2" />
							<path d="M8 20h8M12 16v4" stroke-linecap="round" />
						</svg>
					</button>
					<button
						type="button"
						onclick={() => applyTheme('light')}
						aria-label={m.theme_light()}
						title={m.theme_light()}
						class="rounded-md p-1 transition-colors {mode === 'light'
							? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
							: 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'}"
					>
						<svg
							class="size-3.5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
							aria-hidden="true"
						>
							<circle cx="12" cy="12" r="4" />
							<path
								stroke-linecap="round"
								d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1.06 1.06M17.3 17.3l1.1 1.1M5.6 18.4l1.06-1.06M17.3 6.6l1.1-1.1"
							/>
						</svg>
					</button>
					<button
						type="button"
						onclick={() => applyTheme('dark')}
						aria-label={m.theme_dark()}
						title={m.theme_dark()}
						class="rounded-md p-1 transition-colors {mode === 'dark'
							? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
							: 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'}"
					>
						<svg
							class="size-3.5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
							/>
						</svg>
					</button>
				</div>
			</div>

			<!-- Language row -->
			<div
				class="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300"
			>
				<span class="flex items-center gap-2.5">
					<svg
						class="size-4 text-zinc-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="1.8"
						aria-hidden="true"
					>
						<circle cx="12" cy="12" r="9" />
						<path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
					</svg>
					{getLocale() === 'en' ? 'Language' : 'Dil'}
				</span>
				<div class="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
					{#each locales as loc (loc)}
						<button
							type="button"
							onclick={() => setLocale(loc)}
							class="rounded-md px-2 py-0.5 text-xs font-semibold uppercase transition-colors {activeLocale ===
							loc
								? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
								: 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'}"
						>
							{loc}
						</button>
					{/each}
				</div>
			</div>

			<div class="my-1 h-px bg-zinc-100 dark:bg-zinc-800"></div>

			<!-- Logout -->
			<form method="POST" action="/api/auth/logout" class="p-0">
				<button
					type="submit"
					role="menuitem"
					class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
				>
					<svg
						class="size-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="1.8"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M15 12H4m0 0 4-4m-4 4 4 4m6-12h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"
						/>
					</svg>
					{m.logout()}
				</button>
			</form>
		</div>
	{/if}
</div>
