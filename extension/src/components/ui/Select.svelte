<script lang="ts">
	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		value: string;
		options: Option[];
		disabled?: boolean;
		onchange?: (value: string) => void;
	}

	let { value = $bindable(), options, disabled = false, onchange }: Props = $props();
</script>

<select
	bind:value
	{disabled}
	onchange={(e) => onchange?.(e.currentTarget.value)}
	class="w-full appearance-none rounded-xl border border-[#E7DFD5] bg-white px-3 py-2 text-xs font-semibold text-[#1C1917] focus:outline-none focus:border-[#7A2222] cursor-pointer disabled:opacity-60"
>
	{#each options as option (option.value)}
		<option value={option.value}>{option.label}</option>
	{/each}
</select>
