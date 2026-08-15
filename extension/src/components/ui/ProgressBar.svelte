<script lang="ts">
	interface Props {
		/** Percentuale 0-100. Ignorata quando `indeterminate` è true. */
		value?: number;
		indeterminate?: boolean;
		tone?: 'terracotta' | 'ai';
	}

	let { value = 0, indeterminate = false, tone = 'terracotta' }: Props = $props();

	const tracks = { terracotta: 'bg-[#F5EBE6]', ai: 'bg-purple-100' };
	const fills = {
		terracotta: 'bg-[#7A2222]',
		ai: 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600'
	};
</script>

<div class="h-1.5 w-full rounded-full overflow-hidden {tracks[tone]}">
	{#if indeterminate}
		<div class="h-full animate-loading-slide {fills[tone]}"></div>
	{:else}
		<div
			class="h-full rounded-full transition-[width] duration-300 {fills[tone]}"
			style="width: {Math.max(0, Math.min(100, value))}%"
		></div>
	{/if}
</div>
