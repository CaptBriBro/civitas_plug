<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'outline' | 'ai' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
		full?: boolean;
		title?: string;
		onclick?: (e: MouseEvent) => void;
		children?: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		type = 'button',
		full = false,
		title,
		onclick,
		children
	}: Props = $props();

	const base =
		'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

	const sizes = {
		sm: 'px-3 py-1.5 text-xs gap-1.5',
		md: 'px-4 py-2 text-xs gap-2',
		lg: 'px-5 py-2.5 text-sm gap-2.5'
	};

	const variants = {
		primary: 'bg-[#7A2222] hover:bg-[#631B1B] text-white shadow-xs active:scale-[0.98]',
		secondary: 'bg-[#F5EBE6] hover:bg-[#EBDCD3] text-[#7A2222] border border-[#E7DFD5]',
		outline: 'border border-[#E7DFD5] text-[#57534E] hover:bg-white hover:text-[#1C1917] hover:border-[#78716C]',
		/* Viola: tutto ciò che passa da un modello */
		ai: 'bg-purple-50 text-purple-900 border border-purple-300 hover:bg-purple-100 shadow-xs active:scale-95',
		danger: 'bg-rose-700 hover:bg-rose-800 text-white shadow-xs'
	};
</script>

<button
	{type}
	{disabled}
	{title}
	{onclick}
	class="{base} {sizes[size]} {variants[variant]} {full ? 'w-full' : ''}"
>
	{@render children?.()}
</button>
