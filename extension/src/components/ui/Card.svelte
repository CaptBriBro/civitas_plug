<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		subtitle?: string;
		accent?: 'warm' | 'ai';
		children?: Snippet;
		actions?: Snippet;
	}

	let { title = '', subtitle = '', accent = 'warm', children, actions }: Props = $props();

	const surfaces = {
		warm: 'bg-white border border-[#E7DFD5]',
		ai: 'ai-surface'
	};
</script>

<div class="{surfaces[accent]} rounded-2xl p-5 shadow-xs">
	{#if title || actions}
		<div class="mb-4 flex items-start justify-between gap-3">
			<div>
				{#if title}
					<h3 class="text-base font-semibold text-[#1C1917] font-display">{title}</h3>
				{/if}
				{#if subtitle}
					<p class="text-xs text-[#78716C] mt-0.5">{subtitle}</p>
				{/if}
			</div>
			{@render actions?.()}
		</div>
	{/if}
	{@render children?.()}
</div>
