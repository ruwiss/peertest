<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { getLocale, setLocale, locales } from '$lib/paraglide/runtime';
	import { page } from '$app/state';
	import ThemeToggle from './ThemeToggle.svelte';
	import UserMenu from './UserMenu.svelte';
	import NotifBell from './NotifBell.svelte';

	interface HeaderUser {
		firstName: string;
		username: string | null;
		avatarUrl: string | null;
		role: string;
	}

	interface NotifSummary {
		trades: number;
		openCheckpoints: number;
		total: number;
	}

	let { user, notif }: { user: HeaderUser | null; notif?: NotifSummary } = $props();

	const path = $derived(page.url.pathname);
	const activeLocale = getLocale();
	let mobileOpen = $state(false);

	const navLinks = $derived([
		{ href: '/apps', label: m.nav_apps(), show: true, mobileOnly: false },
		{ href: '/commitments', label: m.nav_commitments(), show: !!user, mobileOnly: false },
		{ href: '/my-apps', label: m.nav_my_apps(), show: !!user, mobileOnly: true },
		{ href: '/', label: m.nav_how_it_works(), show: true, mobileOnly: true },
		{ href: '/admin', label: m.nav_admin(), show: user?.role === 'admin', mobileOnly: false }
	]);

	function isActive(href: string): boolean {
		if (href === '/') return path === '/';
		return path.startsWith(href);
	}

	const brandActive = $derived(path === '/');
</script>

<header
	class="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80"
>
	<div class="mx-auto flex h-14 max-w-4xl items-center gap-2 px-3 sm:gap-4 sm:px-4">
		<!-- Hamburger - sadece mobil -->
		<button
			type="button"
			onclick={() => (mobileOpen = !mobileOpen)}
			aria-label="Menu"
			aria-expanded={mobileOpen}
			class="-ml-1 inline-flex size-9 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 sm:hidden dark:text-zinc-300 dark:hover:bg-zinc-800"
		>
			{#if mobileOpen}
				<svg class="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
						clip-rule="evenodd"
					/>
				</svg>
			{:else}
				<svg
					class="size-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			{/if}
		</button>

		<a
			href="/"
			class="flex items-center gap-2 text-lg font-bold tracking-tight transition-colors {brandActive
				? 'text-tg-600 dark:text-tg-400'
				: 'text-zinc-900 hover:text-tg-600 dark:text-zinc-100 dark:hover:text-tg-400'}"
		>
			<img src="/logo.png" alt="" class="size-7 rounded-xl" />
			<span>PeerTest</span>
		</a>

		<!-- Masaustu nav -->
		<nav class="hidden items-center gap-1 sm:flex">
			{#each navLinks.filter((l) => !l.mobileOnly) as link (link.href)}
				{#if link.show}
					<a
						href={link.href}
						class="rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors {isActive(
							link.href
						)
							? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
							: 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'}"
					>
						{link.label}
					</a>
				{/if}
			{/each}
		</nav>

		<div class="ml-auto flex items-center gap-2">
			{#if user}
				{#if notif}
					<NotifBell {notif} />
				{/if}
				<UserMenu {user} />
			{:else}
				<!-- Anonim kullanici icin sadeleştirilmis bar: dil + tema + giris (mobilde sadece giris) -->
				<div
					class="hidden items-center rounded-lg border border-zinc-200 p-0.5 sm:flex dark:border-zinc-800"
				>
					{#each locales as loc (loc)}
						<button
							onclick={() => setLocale(loc)}
							class="rounded-md px-2 py-0.5 text-xs font-medium uppercase {activeLocale === loc
								? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
								: 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'}"
						>
							{loc}
						</button>
					{/each}
				</div>
				<div class="hidden sm:block">
					<ThemeToggle />
				</div>
				<a
					href="/login"
					class="rounded-lg bg-tg-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-tg-500"
				>
					{m.login()}
				</a>
			{/if}
		</div>
	</div>

	<!-- Mobil ac/kapa nav paneli -->
	{#if mobileOpen}
		<div
			class="border-t border-zinc-200 bg-white px-3 py-2 sm:hidden dark:border-zinc-800 dark:bg-zinc-950"
		>
			<nav class="flex flex-col gap-0.5">
				{#each navLinks as link (link.href)}
					{#if link.show}
						<a
							href={link.href}
							onclick={() => (mobileOpen = false)}
							class="rounded-md px-3 py-2 text-sm font-medium transition-colors {isActive(link.href)
								? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
								: 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800'}"
						>
							{link.label}
						</a>
					{/if}
				{/each}
				{#if !user}
					<div
						class="mt-2 flex items-center gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-800"
					>
						<div
							class="flex items-center rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800"
						>
							{#each locales as loc (loc)}
								<button
									onclick={() => setLocale(loc)}
									class="rounded-md px-2 py-0.5 text-xs font-medium uppercase {activeLocale === loc
										? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
										: 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'}"
								>
									{loc}
								</button>
							{/each}
						</div>
						<ThemeToggle />
					</div>
				{/if}
			</nav>
		</div>
	{/if}
</header>
