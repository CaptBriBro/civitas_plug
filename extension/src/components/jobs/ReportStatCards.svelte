<script lang="ts">
	import {
		BookOpen,
		FileText,
		Sparkles,
		Link2,
		AlertTriangle,
		CheckCircle2
	} from 'lucide-svelte';

	interface Props {
		isUpdatesTask: boolean;
		totalItemsCount: number;
		totalReferencesCount: number;
		aiExtractedCount: number;
		linkedLawsCount: number;
		brokenLinksCount: number;
		resolvedLinksCount: number;
		isLlmVerified: boolean;
	}

	let {
		isUpdatesTask,
		totalItemsCount,
		totalReferencesCount,
		aiExtractedCount,
		linkedLawsCount,
		brokenLinksCount,
		resolvedLinksCount,
		isLlmVerified
	}: Props = $props();
</script>

<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
	<!-- Totale Articoli / Novelle -->
	<div class="p-3 bg-white rounded-xl border border-[#E7DFD5] shadow-2xs">
		<div class="flex items-center gap-1.5 text-stone-500 font-semibold mb-1">
			<BookOpen class="w-4 h-4 text-[#7A2222]" />
			<span>{isUpdatesTask ? 'Novelle' : 'Articoli'}</span>
		</div>
		<span class="text-xl font-extrabold text-stone-900 font-mono">{totalItemsCount}</span>
		<span class="block text-[10px] text-stone-400 mt-0.5 font-sans">
			{isUpdatesTask ? 'Disposizioni lette' : 'Analizzati'}
		</span>
	</div>

	<!-- Riferimenti & Relazioni Estratte -->
	<div class="p-3 bg-white rounded-xl border border-[#E7DFD5] shadow-2xs">
		<div class="flex items-center gap-1.5 text-stone-500 font-semibold mb-1">
			<FileText class="w-4 h-4 text-purple-600" />
			<span>Relazioni & Rinvii</span>
		</div>
		<div class="flex items-baseline gap-1.5">
			<span class="text-xl font-extrabold text-stone-900 font-mono">{totalReferencesCount}</span>
			{#if aiExtractedCount > 0}
				<span class="text-[10px] text-purple-700 font-bold font-mono">({aiExtractedCount} AI)</span>
			{/if}
		</div>
		<span class="block text-[10px] text-stone-400 mt-0.5 font-sans">Rilevati o approvati</span>
	</div>

	<!-- Broken Links -->
	<div class="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 shadow-2xs">
		<div class="flex items-center gap-1.5 text-amber-800 font-semibold mb-1">
			<AlertTriangle class="w-4 h-4 text-amber-600" />
			<span>Broken Links</span>
		</div>
		<div class="flex items-baseline gap-1.5">
			<span class="text-xl font-extrabold text-amber-900 font-mono">{brokenLinksCount}</span>
			{#if resolvedLinksCount > 0}
				<span class="text-[10px] text-emerald-700 font-bold font-mono">({resolvedLinksCount} sanati)</span>
			{/if}
		</div>
		<span class="block text-[10px] text-amber-700/80 mt-0.5 font-sans">Atti esterni non scaricati</span>
	</div>

	<!-- Stato AI -->
	<div class="p-3 bg-purple-50/50 rounded-xl border border-purple-200/80 shadow-2xs">
		<div class="flex items-center gap-1.5 text-purple-900 font-semibold mb-1">
			<Sparkles class="w-4 h-4 text-purple-600" />
			<span>Riconciliazione</span>
		</div>
		{#if isLlmVerified}
			<span class="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-1">
				<CheckCircle2 class="w-4 h-4 text-emerald-600" /> AI Riconciliata
			</span>
		{:else}
			<span class="text-xs text-purple-700 font-medium italic mt-1 block">In attesa di AI</span>
		{/if}
		<span class="block text-[10px] text-purple-600/80 mt-0.5 font-sans">Qualificazione relazioni</span>
	</div>
</div>
