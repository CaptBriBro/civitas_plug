<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'terracotta' | 'green' | 'amber' | 'red' | 'purple' | 'indigo' | 'stone';
		children?: Snippet;
	}

	let { variant = 'terracotta', children }: Props = $props();

	const variants = {
		terracotta: 'bg-[#F5EBE6] text-[#7A2222] border-[#E7DFD5]',
		green: 'bg-emerald-100 text-emerald-800 border-emerald-300',
		amber: 'bg-amber-100 text-amber-800 border-amber-300',
		red: 'bg-rose-100 text-rose-800 border-rose-300',
		purple: 'bg-purple-100 text-purple-900 border-purple-300',
		indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
		stone: 'bg-stone-100 text-stone-700 border-stone-300'
	};
</script>

<span
	class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border {variants[variant]}"
>
	{@render children?.()}
</span>
