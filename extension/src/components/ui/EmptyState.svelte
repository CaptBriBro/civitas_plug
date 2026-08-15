<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		message: string;
		children?: Snippet;
	}

	let { message, children }: Props = $props();
</script>

<div
	class="rounded-2xl border border-dashed border-[#E7DFD5] bg-[#FAF6F0] p-8 text-center text-xs text-[#78716C] space-y-3"
>
	<p>{message}</p>
	{@render children?.()}
</div>
