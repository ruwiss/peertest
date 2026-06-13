<script lang="ts">
	// Tek noktadan SVG ikonlari: emoji yerine kullanilir. Hepsi 24x24 viewBox.
	type IconName =
		| 'swap'
		| 'handshake'
		| 'lock'
		| 'unlock'
		| 'check-circle'
		| 'wave'
		| 'bell'
		| 'sparkles'
		| 'trade'
		| 'dots';

	interface Props {
		name: IconName;
		class?: string;
		strokeWidth?: number;
		'aria-label'?: string;
	}

	let { name, class: cls = 'size-4', strokeWidth = 1.8, ...rest }: Props = $props();
</script>

{#if name === 'swap' || name === 'trade'}
	<!-- swap / trade: iki yatay ok birbirini takip ediyor -->
	<svg
		class={cls}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden={!rest['aria-label']}
		aria-label={rest['aria-label']}
	>
		<path d="M8 3 4 7l4 4" />
		<path d="M4 7h12a4 4 0 0 1 4 4v0" />
		<path d="m16 21 4-4-4-4" />
		<path d="M20 17H8a4 4 0 0 1-4-4v0" />
	</svg>
{:else if name === 'handshake'}
	<!-- handshake / karsiliksiz: birlesik el ikonlari -->
	<svg
		class={cls}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden={!rest['aria-label']}
		aria-label={rest['aria-label']}
	>
		<path d="m11 17 2 2a1 1 0 1 0 3-3" />
		<path
			d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"
		/>
		<path d="m21 3 1 11h-2" />
		<path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
		<path d="M3 4h8" />
	</svg>
{:else if name === 'lock'}
	<svg
		class={cls}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden={!rest['aria-label']}
		aria-label={rest['aria-label']}
	>
		<rect x="3" y="11" width="18" height="11" rx="2" />
		<path d="M7 11V7a5 5 0 0 1 10 0v4" />
	</svg>
{:else if name === 'unlock'}
	<svg
		class={cls}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden={!rest['aria-label']}
		aria-label={rest['aria-label']}
	>
		<rect x="3" y="11" width="18" height="11" rx="2" />
		<path d="M7 11V7a5 5 0 0 1 9.9-1" />
	</svg>
{:else if name === 'check-circle'}
	<svg
		class={cls}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden={!rest['aria-label']}
		aria-label={rest['aria-label']}
	>
		<circle cx="12" cy="12" r="10" />
		<path d="m8 12 3 3 5-6" />
	</svg>
{:else if name === 'wave'}
	<svg
		class={cls}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden={!rest['aria-label']}
		aria-label={rest['aria-label']}
	>
		<path d="M9 11V6a1.5 1.5 0 0 1 3 0v4" />
		<path d="M12 10V4.5a1.5 1.5 0 0 1 3 0V12" />
		<path d="M15 8a1.5 1.5 0 0 1 3 0v5" />
		<path d="M6 11.5V8a1.5 1.5 0 0 1 3 0V13" />
		<path d="M6 11c-.667 0-1.5.5-1.5 1.5 0 1 .5 4 3 6 1.5 1.2 5.5 1.5 8.5-.5 3-2 4-7 3.5-9" />
	</svg>
{:else if name === 'bell'}
	<svg
		class={cls}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden={!rest['aria-label']}
		aria-label={rest['aria-label']}
	>
		<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
		<path d="M10 21a2 2 0 0 0 4 0" />
	</svg>
{:else if name === 'sparkles'}
	<svg
		class={cls}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden={!rest['aria-label']}
		aria-label={rest['aria-label']}
	>
		<path d="M12 3 13.9 8.1 19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
		<path d="M19 3v4M21 5h-4M5 17v3M6.5 18.5h-3" />
	</svg>
{:else if name === 'dots'}
	<!-- yatay uc nokta: tasma (overflow) aksiyon menusu -->
	<svg
		class={cls}
		viewBox="0 0 24 24"
		fill="currentColor"
		stroke="none"
		aria-hidden={!rest['aria-label']}
		aria-label={rest['aria-label']}
	>
		<circle cx="5" cy="12" r="1.6" />
		<circle cx="12" cy="12" r="1.6" />
		<circle cx="19" cy="12" r="1.6" />
	</svg>
{/if}
