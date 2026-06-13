<script lang="ts">
	interface Props {
		href: string;
		label: string;
	}
	let { href, label }: Props = $props();
</script>

<a
	{href}
	class="group inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
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
