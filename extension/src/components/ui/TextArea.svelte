<script lang="ts">
	interface Props {
		id?: string;
		value: string;
		placeholder?: string;
		rows?: number;
		disabled?: boolean;
		monospace?: boolean;
		oninput?: (value: string) => void;
	}

	let {
		id,
		value = $bindable(),
		placeholder = '',
		rows = 8,
		disabled = false,
		monospace = false,
		oninput
	}: Props = $props();
</script>

<textarea
	{id}
	bind:value
	{placeholder}
	{rows}
	{disabled}
	oninput={(e) => oninput?.(e.currentTarget.value)}
	class="w-full rounded-2xl border border-[#E7DFD5] bg-white p-3 text-xs text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition-colors resize-y disabled:opacity-60 {monospace
		? 'font-mono text-[11px]'
		: ''}"
></textarea>
