<script lang="ts">
	interface Props {
		href: string;
		label: string;
	}
	let { href, label }: Props = $props();
</script>

<a
	{href}
	class="group inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
>
	<svg
		class="size-4 transition-transform group-hover:-translate-x-0.5"
		viewBox="0 0 20 20"
		fill="none"
		stroke="currentColor"
		stroke-width="1.8"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M12.5 5 7 10l5.5 5" />
	</svg>
	{label}
</a>
