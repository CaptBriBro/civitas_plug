<script lang="ts">
	import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		tone?: 'info' | 'success' | 'warning' | 'error';
		message?: string;
		children?: Snippet;
		actions?: Snippet;
	}

	let { tone = 'info', message = '', children, actions }: Props = $props();

	const tones = {
		info: { box: 'bg-indigo-50 border-indigo-200 text-indigo-900', Icon: Info },
		success: { box: 'bg-emerald-50 border-emerald-200 text-emerald-900', Icon: CheckCircle2 },
		warning: { box: 'bg-amber-50 border-amber-200 text-amber-900', Icon: AlertTriangle },
		error: { box: 'bg-rose-50 border-rose-200 text-rose-900', Icon: XCircle }
	};

	let current = $derived(tones[tone]);
</script>

<div class="rounded-2xl border p-3 text-xs flex items-start gap-2.5 {current.box}">
	{#key tone}
		{@const Icon = current.Icon}
		<Icon class="w-4 h-4 shrink-0 mt-0.5" />
	{/key}
	<div class="min-w-0 flex-1 space-y-2">
		{#if message}<p class="leading-relaxed">{message}</p>{/if}
		{@render children?.()}
		{@render actions?.()}
	</div>
</div>
