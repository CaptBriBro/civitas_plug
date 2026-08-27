<script lang="ts">
	import { CheckCircle2, BarChart3 } from 'lucide-svelte';
	import Button from '@/components/ui/Button.svelte';
	import Badge from '@/components/ui/Badge.svelte';

	interface Props {
		providerName: string;
		providerBadge: 'purple' | 'indigo' | 'blue';
		addedCount: number;
		confirmedCount: number;
		removedCount: number;
		onOpenCompare: () => void;
	}

	let {
		providerName,
		providerBadge,
		addedCount,
		confirmedCount,
		removedCount,
		onOpenCompare
	}: Props = $props();

	let borderClass = $derived.by(() => {
		if (providerBadge === 'indigo' || providerBadge === 'blue') return 'border-blue-200';
		return 'border-purple-200';
	});
</script>

<div class="p-4 rounded-xl border bg-[#FAF6F0] space-y-3 shadow-2xs {borderClass} animate-in fade-in">
	<div class="flex items-center justify-between border-b border-[#E7DFD5] pb-2">
		<span class="text-xs font-bold text-stone-950 flex items-center gap-1.5">
			<CheckCircle2 class="w-4 h-4 text-purple-700" /> Brief KPI Summary {providerName}
		</span>
		<Badge variant={providerBadge}>🤖 {providerName}</Badge>
	</div>

	<div class="grid grid-cols-3 gap-2 text-center text-xs font-bold">
		<div class="p-2 bg-emerald-50 text-emerald-900 rounded border border-emerald-200">
			<span class="block text-sm font-extrabold">{addedCount}</span>
			<span class="text-[9px]">Nuove Relazioni</span>
		</div>
		<div class="p-2 bg-purple-50 text-purple-900 rounded border border-purple-200">
			<span class="block text-sm font-extrabold">{confirmedCount}</span>
			<span class="text-[9px]">Confermate</span>
		</div>
		<div class="p-2 bg-amber-50 text-amber-900 rounded border border-amber-200">
			<span class="block text-sm font-extrabold">{removedCount}</span>
			<span class="text-[9px]">Sparite / Escluse</span>
		</div>
	</div>

	<div class="pt-2 flex flex-col sm:flex-row gap-2">
		<Button variant="ai" full size="sm" onclick={onOpenCompare}>
			<BarChart3 class="w-4 h-4" /> 📊 Apri Finestra Analisi & Approva Risultati
		</Button>
	</div>
</div>
