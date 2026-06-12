<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	interface Props {
		url: string;
		title?: string;
		onclose: () => void;
	}
	let { url, title, onclose }: Props = $props();

	let dataUrl = $state('');
	let failed = $state(false);

	// QR'i istemcide uret (qrcode lazy import — SSR/ana paket disinda kalir).
	$effect(() => {
		let cancelled = false;
		(async () => {
			try {
				const { default: QRCode } = await import('qrcode');
				const d = await QRCode.toDataURL(url, { width: 320, margin: 1, errorCorrectionLevel: 'M' });
				if (!cancelled) dataUrl = d;
			} catch {
				if (!cancelled) failed = true;
			}
		})();
		return () => {
			cancelled = true;
		};
	});
</script>

<div
	class="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
	role="button"
	tabindex="0"
	onclick={(e) => {
		if (e.target === e.currentTarget) onclose();
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape') onclose();
	}}
>
	<div
		class="w-full max-w-xs rounded-t-2xl border border-zinc-200 bg-white p-5 shadow-xl sm:rounded-2xl dark:border-zinc-800 dark:bg-zinc-900"
	>
		<div class="mb-1 flex items-center justify-between gap-2">
			<h2 class="text-base font-semibold text-zinc-900 dark:text-zinc-100">
				{title ?? m.qr_title()}
			</h2>
			<button
				type="button"
				onclick={onclose}
				aria-label={m.qr_close()}
				class="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
			>
				<svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path
						d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
					/>
				</svg>
			</button>
		</div>
		<p class="mb-4 text-xs text-zinc-500 dark:text-zinc-400">{m.qr_hint()}</p>

		<!-- QR her temada okunabilir olsun diye beyaz zemin -->
		<div
			class="mx-auto mb-4 flex aspect-square w-48 items-center justify-center rounded-xl bg-white p-2 ring-1 ring-zinc-200"
		>
			{#if dataUrl}
				<img src={dataUrl} alt="QR" class="h-full w-full" />
			{:else if failed}
				<span class="px-2 text-center text-xs text-zinc-400">{m.qr_failed()}</span>
			{:else}
				<svg
					class="size-6 animate-spin text-zinc-300"
					viewBox="0 0 24 24"
					fill="none"
					aria-hidden="true"
				>
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
					/>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z"
					/>
				</svg>
			{/if}
		</div>

		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			onclick={onclose}
			class="flex w-full items-center justify-center gap-1.5 rounded-lg bg-tg-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-tg-500"
		>
			<svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
				<path
					d="M11 3a1 1 0 1 0 0 2h2.586l-6.293 6.293a1 1 0 1 0 1.414 1.414L15 6.414V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5Z"
				/>
				<path
					d="M5 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 0 0 0-2H5Z"
				/>
			</svg>
			{m.qr_open_link()}
		</a>
	</div>
</div>
