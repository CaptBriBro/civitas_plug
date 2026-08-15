<script lang="ts">
	import { browser } from 'wxt/browser';
	import EnvBadge from './EnvBadge.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		subtitle?: string;
		compact?: boolean;
		actions?: Snippet;
	}

	let { subtitle = '', compact = false, actions }: Props = $props();

	const logo = browser.runtime.getURL('/icon/96.png');
</script>

<header
	class="flex items-center justify-between gap-3 {compact ? 'px-4 py-3' : 'px-6 py-4'} bg-white border-b border-[#E7DFD5]"
>
	<div class="flex items-center gap-2.5 min-w-0">
		<img src={logo} alt="" class="w-11 h-11 shrink-0" />
		<div class="min-w-0">
			<div class="flex items-center gap-2">
				<h1 class="font-display font-bold text-[#1C1917] {compact ? 'text-sm' : 'text-base'}">
					Civitas
				</h1>
				<EnvBadge />
			</div>
			{#if subtitle}
				<p class="text-[11px] text-[#78716C] truncate">{subtitle}</p>
			{/if}
		</div>
	</div>

	{@render actions?.()}
</header>
