<script lang="ts">
	import { Sparkles, Layers, Columns } from 'lucide-svelte';
	import type { ParsedAiResponse } from '@/features/results/responseParser';
	import type { ExtractedRelation } from '@/domain/workset';

	interface Props {
		activeProviderTab: 'chatgpt' | 'gemini' | 'both' | 'compare';
		reportChatGPT: ParsedAiResponse | null;
		reportGemini: ParsedAiResponse | null;
		consensusAnalysis: {
			agreed: ExtractedRelation[];
			onlyChatGPT: ExtractedRelation[];
			onlyGemini: ExtractedRelation[];
		} | null;
		onSelectTab: (tab: 'chatgpt' | 'gemini' | 'both' | 'compare') => void;
	}

	let {
		activeProviderTab,
		reportChatGPT,
		reportGemini,
		consensusAnalysis,
		onSelectTab
	}: Props = $props();
</script>

<div class="flex items-center gap-2 border-b border-[#E7DFD5] pb-2 overflow-x-auto">
	<button
		type="button"
		onclick={() => onSelectTab('chatgpt')}
		class="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0
			{activeProviderTab === 'chatgpt' ? 'bg-purple-900 text-white border-purple-900 shadow-2xs' : 'bg-white text-stone-700 border-[#E7DFD5] hover:bg-[#FAF6F0]'}"
	>
		<Sparkles class="w-3.5 h-3.5 text-purple-300" /> ChatGPT (OpenAI)
		{#if reportChatGPT}
			<span class="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-mono font-bold">
				{reportChatGPT.relations.length}
			</span>
		{/if}
	</button>

	<button
		type="button"
		onclick={() => onSelectTab('gemini')}
		class="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0
			{activeProviderTab === 'gemini' ? 'bg-blue-900 text-white border-blue-900 shadow-2xs' : 'bg-white text-stone-700 border-[#E7DFD5] hover:bg-[#FAF6F0]'}"
	>
		<Sparkles class="w-3.5 h-3.5 text-blue-300" /> Gemini (Google)
		{#if reportGemini}
			<span class="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-mono font-bold">
				{reportGemini.relations.length}
			</span>
		{/if}
	</button>

	<button
		type="button"
		onclick={() => onSelectTab('both')}
		class="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0
			{activeProviderTab === 'both' ? 'bg-stone-900 text-white border-stone-900 shadow-2xs' : 'bg-white text-stone-700 border-[#E7DFD5] hover:bg-[#FAF6F0]'}"
	>
		<Layers class="w-3.5 h-3.5 text-stone-400" /> Mostra Entrambi in Sequenza
	</button>

	<button
		type="button"
		onclick={() => onSelectTab('compare')}
		class="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0
			{activeProviderTab === 'compare' ? 'bg-[#7A2222] text-white border-[#7A2222] shadow-2xs' : 'bg-[#FAF6F0] text-[#7A2222] border-[#E7DFD5] hover:bg-[#F2EADF]'}"
	>
		<Columns class="w-3.5 h-3.5 text-[#7A2222]" /> Confronto & Riconciliazione
		{#if consensusAnalysis}
			<span class="px-1.5 py-0.2 rounded-full bg-purple-700 text-white text-[10px] font-mono font-bold">
				{consensusAnalysis.agreed.length} concordati
			</span>
		{/if}
	</button>
</div>
