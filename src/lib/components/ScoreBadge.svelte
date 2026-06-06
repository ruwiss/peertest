<script lang="ts">
	import { scoreTone, scoreClass } from '$lib/utils/score';

	interface Props {
		score: number;
		dimBelow: number;
	}
	let { score, dimBelow }: Props = $props();
	const cls = $derived(scoreClass(scoreTone(score, dimBelow)));
</script>

<span class="inline-flex items-center gap-1 font-mono text-xs {cls}" title="Guven puani">
	<svg class="size-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
		<path d="M12 2l2.4 6.9H21l-5.4 4 2 6.9L12 16.6 6.4 19.8l2-6.9L3 8.9h6.6z" />
	</svg>
	{score}
</span>
