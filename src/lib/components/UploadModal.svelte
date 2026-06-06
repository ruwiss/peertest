<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	interface Props {
		title?: string;
		instruction?: string;
		onuploaded: (shot: { url: string; shareUrl: string }) => void;
		onclose: () => void;
	}
	let { title = m.upload_title(), instruction, onuploaded, onclose }: Props = $props();

	let file = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let dims = $state<{ w: number; h: number } | null>(null);
	let busy = $state(false);
	let error = $state<string | null>(null);

	function pick(f: File | null | undefined) {
		error = null;
		if (!f) return;
		if (!f.type.startsWith('image/')) {
			error = m.upload_invalid_type();
			return;
		}
		file = f;
		previewUrl = URL.createObjectURL(f);
		const img = new Image();
		img.onload = () => (dims = { w: img.naturalWidth, h: img.naturalHeight });
		img.src = previewUrl;
	}

	async function submit() {
		if (!file || !dims) return;
		busy = true;
		error = null;
		try {
			const fd = new FormData();
			fd.append('image', file);
			fd.append('width', String(dims.w));
			fd.append('height', String(dims.h));
			const res = await fetch('/api/upload', { method: 'POST', body: fd });
			if (!res.ok) {
				const b = await res.json().catch(() => ({}));
				throw new Error(b.message ?? m.upload_failed());
			}
			const shot = (await res.json()) as { url: string; shareUrl: string };
			onuploaded(shot);
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
	role="presentation"
	onclick={(e) => {
		if (e.target === e.currentTarget && !busy) onclose();
	}}
>
	<div
		class="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
	>
		<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
		{#if instruction}
			<p
				class="mt-2 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
			>
				{instruction}
			</p>
		{/if}

		<label
			class="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center hover:border-tg-400 dark:border-zinc-600"
			ondragover={(e) => e.preventDefault()}
			ondrop={(e) => {
				e.preventDefault();
				pick(e.dataTransfer?.files?.[0]);
			}}
		>
			{#if previewUrl}
				<img src={previewUrl} alt="" class="max-h-48 rounded-lg" />
				<span class="mt-2 text-xs text-zinc-500">{m.upload_replace()}</span>
			{:else}
				<span class="text-sm text-zinc-500">{m.upload_dropzone()}</span>
			{/if}
			<input
				type="file"
				accept="image/*"
				class="hidden"
				onchange={(e) => pick((e.currentTarget as HTMLInputElement).files?.[0])}
			/>
		</label>

		{#if error}
			<p class="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
		{/if}

		<div class="mt-5 flex justify-end gap-2">
			<button
				type="button"
				onclick={onclose}
				disabled={busy}
				class="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
			>
				{m.upload_cancel()}
			</button>
			<button
				type="button"
				onclick={submit}
				disabled={busy || !file}
				class="rounded-lg bg-tg-600 px-4 py-2 text-sm font-medium text-white hover:bg-tg-500 disabled:opacity-50"
			>
				{busy ? m.upload_submitting() : m.upload_submit()}
			</button>
		</div>
	</div>
</div>
