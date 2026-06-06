<script lang="ts">
	import './layout.css';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Login gibi odakli ekranlarda ust cubuk gizlenir.
	const hideChrome = $derived(page.url.pathname === '/login');
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if hideChrome}
	{@render children()}
{:else}
	<Header user={data.user} notif={data.notif} />
	<main>{@render children()}</main>
{/if}
