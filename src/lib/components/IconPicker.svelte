<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	interface Props {
		value: string;
		onchange: (url: string) => void;
		name?: string;
	}

	let { value = $bindable(''), onchange, name = 'iconUrl' }: Props = $props();

	let busy = $state(false);
	let error = $state<string | null>(null);
	let inputEl = $state<HTMLInputElement>();

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

	async function uploadFile(file: File | null | undefined) {
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			error = m.upload_invalid_type();
			return;
		}
		busy = true;
		error = null;
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
			const body = (await res.json()) as { url: string; shareUrl: string };
			value = body.url;
			onchange(body.url);
		} catch (e) {
			error = m.my_apps_form_icon_failed({ message: (e as Error).message });
		} finally {
			busy = false;
		}
	}
</script>

<div class="flex items-center gap-4">
	<button
		type="button"
		onclick={() => inputEl?.click()}
		ondragover={(e) => e.preventDefault()}
		ondrop={(e) => {
			e.preventDefault();
			uploadFile(e.dataTransfer?.files?.[0]);
		}}
		class="group relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 hover:border-tg-400 hover:bg-tg-50/40 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-tg-500/40 dark:hover:bg-tg-500/5"
		aria-label={value ? m.my_apps_form_icon_replace() : m.my_apps_form_icon_pick()}
	>
		{#if value}
			<img src={value} alt="" class="size-full object-cover" />
			<div
				class="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
			>
				{busy ? m.my_apps_form_icon_uploading() : m.my_apps_form_icon_replace()}
			</div>
		{:else}
			<div class="flex flex-col items-center gap-1 text-zinc-400">
				<svg
					class="size-6"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="17 8 12 3 7 8" />
					<line x1="12" y1="3" x2="12" y2="15" />
				</svg>
				<span class="text-[10px] font-medium"
					>{busy ? m.my_apps_form_icon_uploading() : 'PNG/JPG'}</span
				>
			</div>
		{/if}
	</button>

	<div class="min-w-0 flex-1">
		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={() => inputEl?.click()}
				disabled={busy}
				class="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
			>
				{value ? m.my_apps_form_icon_replace() : m.my_apps_form_icon_pick()}
			</button>
			{#if value}
				<button
					type="button"
					onclick={() => {
						value = '';
						onchange('');
					}}
					class="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
				>
					{m.my_apps_form_icon_remove()}
				</button>
			{/if}
		</div>
		<p class="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
			{m.my_apps_form_icon_helper()}
		</p>
		{#if error}
			<p class="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>
		{/if}
	</div>

	<input
		bind:this={inputEl}
		type="file"
		accept="image/*"
		class="hidden"
		onchange={(e) => uploadFile((e.currentTarget as HTMLInputElement).files?.[0])}
	/>
	<input type="hidden" {name} {value} />
</div>
