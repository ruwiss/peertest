<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';

	interface Props {
		src: string;
		alt?: string;
		onclose: () => void;
	}
	let { src, alt = '', onclose }: Props = $props();

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	onMount(() => {
		// Modal acikken arka plan scroll'unu engelle.
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	});
</script>

<svelte:window onkeydown={onKey} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
	onclick={(e) => {
		if (e.target === e.currentTarget) onclose();
	}}
>
	<!-- Kapat butonu -->
	<button
		type="button"
		onclick={onclose}
		aria-label="Kapat"
		class="absolute top-4 right-4 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
	>
		<svg class="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
			<path
				fill-rule="evenodd"
				d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
				clip-rule="evenodd"
			/>
		</svg>
	</button>

	<!-- Yeni sekmede ac kisayolu (CDN direkt URL) -->
	<a
		href={src}
		target="_blank"
		rel="noopener noreferrer"
		aria-label="Yeni sekmede aç"
		class="absolute top-4 right-16 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
	>
		<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M14 3h7v7" />
			<path d="M21 3 11 13" />
			<path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
		</svg>
	</a>

	<img
		{src}
		{alt}
		class="max-h-[92vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
	/>
</div>
