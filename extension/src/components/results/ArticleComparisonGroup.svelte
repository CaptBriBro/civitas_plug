<script lang="ts">
	import type { ExtractedRelation } from '../../domain/workset';
	import type { LegalArticle } from '../../domain/article';
	import RelationCard from './RelationCard.svelte';
	import Badge from '../ui/Badge.svelte';
	import { FileText, ChevronUp, ChevronDown, CheckCircle2, Bot, Search, ShieldAlert, Info } from 'lucide-svelte';
	import { getRelKey } from '../../utils/relationUtils';

	interface Props {
		artGroup: {
			articleNum: string;
			itemTitle?: string;
			itemSubtitle?: string;
			articleText?: string;
			rubrica?: string;
			artCandidates: Array<{ articleNum: string; text: string; label?: string }>;
			agreed: ExtractedRelation[];
			onlyChatGPT: ExtractedRelation[];
			onlyGemini: ExtractedRelation[];
			missingCandidates: Array<{ text: string; label?: string }>;
		};
		editedRelations: Record<string, ExtractedRelation>;
		relationDecisions: Record<string, 'approved' | 'rejected' | 'pending'>;
		allLocalWorksets: Array<{ jobId: string; jobTitle: string }>;
		articles?: LegalArticle[];
		currentJobTitle?: string;
		isUpdatesTask: boolean;
		expandedArticles: Record<string, boolean>;
		expandedCandidates: Record<string, boolean>;
		onToggleArticleText: (key: string) => void;
		onToggleCandidates: (key: string) => void;
		onToggleDecision: (relKey: string, status: 'approved' | 'rejected') => void;
		onStartEdit: (relKey: string, rel: ExtractedRelation, title: string, text: string) => void;
		onApproveNovella?: (articleNum: string) => void;
	}

	let {
		artGroup,
		editedRelations,
		relationDecisions,
		allLocalWorksets,
		articles = [],
		currentJobTitle = '',
		isUpdatesTask,
		expandedArticles,
		expandedCandidates,
		onToggleArticleText,
		onToggleCandidates,
		onToggleDecision,
		onStartEdit,
		onApproveNovella
	}: Props = $props();
</script>

<div class="p-5 bg-white rounded-2xl border border-[#E7DFD5] space-y-4 text-xs shadow-xs">
	<div class="flex items-center justify-between border-b border-stone-200 pb-3 flex-wrap gap-2">
		<div class="flex items-center gap-2">
			<span class="px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-[#7A2222] text-white">
				📌 {artGroup.itemTitle || `Articolo ${artGroup.articleNum}`}
			</span>
		</div>
		<div class="flex items-center gap-2 text-xs font-mono flex-wrap">
			<span class="px-3 py-1 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">
				✓ {artGroup.agreed.length} concordanti
			</span>
			{#if artGroup.onlyChatGPT.length > 0}
				<span class="px-3 py-1 rounded-md bg-purple-100 text-purple-900 border border-purple-300 font-bold">
					🤖 {artGroup.onlyChatGPT.length} solo ChatGPT
				</span>
			{/if}
			{#if artGroup.onlyGemini.length > 0}
				<span class="px-3 py-1 rounded-md bg-blue-100 text-blue-900 border border-blue-300 font-bold">
					🤖 {artGroup.onlyGemini.length} solo Gemini
				</span>
			{/if}

			<button
				type="button"
				onclick={() => onApproveNovella?.(artGroup.articleNum)}
				class="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 font-sans ml-2"
			>
				✓ Approva Novella
			</button>
		</div>
	</div>

	<!-- ANTEPRIMA & TESTO INTEGRALE DELL'ARTICOLO/NOVELLA CON TOGGLE -->
	{#if artGroup.articleText}
		<div class="p-3.5 bg-[#FAF6F0] rounded-xl border border-[#E7DFD5] space-y-2">
			<div class="flex items-center justify-between">
				<span class="text-[11px] font-bold text-[#78716C] uppercase tracking-wider flex items-center gap-1 font-mono">
					<FileText class="w-3.5 h-3.5 text-[#7A2222]" /> {isUpdatesTask ? 'TESTO DISPOSIZIONE NOVELLANTE' : `Testo dell'Articolo ${artGroup.articleNum}`}
					{#if artGroup.itemSubtitle}<span class="font-normal font-sans italic text-stone-700 font-bold">— {artGroup.itemSubtitle}</span>{/if}
				</span>
			</div>
			<p class="text-xs text-[#1C1917] leading-relaxed font-serif whitespace-pre-wrap">
				{expandedArticles[artGroup.articleNum] || artGroup.articleText.length <= 220
					? artGroup.articleText
					: `${artGroup.articleText.slice(0, 220)}…`}
			</p>
			{#if artGroup.articleText.length > 220}
				<button
					type="button"
					onclick={() => onToggleArticleText(artGroup.articleNum)}
					class="text-[11px] font-bold text-[#7A2222] hover:underline cursor-pointer flex items-center gap-1 mt-1"
				>
					{#if expandedArticles[artGroup.articleNum]}
						<ChevronUp class="w-3.5 h-3.5" /> Nascondi testo
					{:else}
						<ChevronDown class="w-3.5 h-3.5" /> Mostra tutto il testo ({artGroup.articleText.length} caratteri)
					{/if}
				</button>
			{/if}
		</div>
	{/if}

	<!-- RELAZIONI E CANDIDATI EURISTICI INIZIALI RILEVATI PRIMA DELL'AI -->
	{#if artGroup.artCandidates.length > 0}
		<div class="p-3 bg-[#FAF6F0] border border-purple-200/80 rounded-xl space-y-2">
			<button
				type="button"
				onclick={() => onToggleCandidates(artGroup.articleNum)}
				class="w-full flex items-center justify-between text-purple-900 font-bold text-xs cursor-pointer hover:underline"
			>
				<span class="flex items-center gap-1.5 font-sans">
					<Search class="w-4 h-4 text-purple-700" />
					🔍 Riferimenti & Candidati Iniziali Rilevati nel Testo ({artGroup.artCandidates.length} candidati euristici)
				</span>
				{#if expandedCandidates[artGroup.articleNum]}
					<ChevronUp class="w-4 h-4" />
				{:else}
					<ChevronDown class="w-4 h-4" />
				{/if}
			</button>

			{#if expandedCandidates[artGroup.articleNum]}
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 animate-in fade-in">
					{#each artGroup.artCandidates as candidate, cIdx (`cand_${artGroup.articleNum}_${cIdx}`)}
						<div class="p-2.5 bg-white rounded-lg border border-purple-200 shadow-2xs flex items-center justify-between">
							<span class="font-mono text-stone-900 font-bold text-xs">{candidate.text}</span>
							<Badge variant="purple">Candidato Iniziale</Badge>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- RELAZIONI CONCORDANTI CON TASTI APPROVA / RIFIUTA -->
	{#if artGroup.agreed.length > 0}
		<div class="space-y-2">
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-bold text-emerald-900 flex items-center gap-1.5 font-display">
					<CheckCircle2 class="w-4 h-4 text-emerald-600" /> Relazioni Confermate da Entrambi i Modelli
				</span>
				<span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
					{artGroup.agreed.length} {artGroup.agreed.length === 1 ? 'relazione trovata' : 'relazioni trovate'}
				</span>
			</div>

			{#each artGroup.agreed as rel, aIdx (`agreed_${artGroup.articleNum}_${aIdx}`)}
				{@const relKey = getRelKey(rel, `agreed_${artGroup.articleNum}`, aIdx)}
				<RelationCard
					{rel}
					{relKey}
					index={aIdx + 1}
					editedRel={editedRelations[relKey]}
					decision={relationDecisions[relKey] || 'pending'}
					theme="emerald"
					articleTitle={artGroup.itemTitle && artGroup.itemSubtitle ? `${artGroup.itemTitle} — ${artGroup.itemSubtitle}` : artGroup.itemTitle || artGroup.itemSubtitle || ''}
					articleText={artGroup.articleText || ''}
					{allLocalWorksets}
					{articles}
					{currentJobTitle}
					{isUpdatesTask}
					{onToggleDecision}
					{onStartEdit}
				/>
			{/each}
		</div>
	{/if}

	<!-- RELAZIONI ESCLUSIVE CHATGPT CON TASTI APPROVA / RIFIUTA -->
	{#if artGroup.onlyChatGPT.length > 0}
		<div class="space-y-2">
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-bold text-purple-900 flex items-center gap-1.5 font-display">
					<Bot class="w-4 h-4 text-purple-700" /> Solo ChatGPT (da valutare)
				</span>
				<span class="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2.5 py-0.5">
					{artGroup.onlyChatGPT.length} {artGroup.onlyChatGPT.length === 1 ? 'relazione' : 'relazioni'}
				</span>
			</div>

			{#each artGroup.onlyChatGPT as rel, cIdx (`cOnly_${artGroup.articleNum}_${cIdx}`)}
				{@const relKey = getRelKey(rel, `chatgpt_${artGroup.articleNum}`, cIdx)}
				<RelationCard
					{rel}
					{relKey}
					index={cIdx + 1}
					editedRel={editedRelations[relKey]}
					decision={relationDecisions[relKey] || 'pending'}
					theme="purple"
					articleTitle={artGroup.itemTitle && artGroup.itemSubtitle ? `${artGroup.itemTitle} — ${artGroup.itemSubtitle}` : artGroup.itemTitle || artGroup.itemSubtitle || ''}
					articleText={artGroup.articleText || ''}
					{allLocalWorksets}
					{articles}
					{currentJobTitle}
					{isUpdatesTask}
					{onToggleDecision}
					{onStartEdit}
				/>
			{/each}
		</div>
	{/if}

	<!-- RELAZIONI ESCLUSIVE GEMINI CON TASTI APPROVA / RIFIUTA -->
	{#if artGroup.onlyGemini.length > 0}
		<div class="space-y-2">
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-bold text-blue-900 flex items-center gap-1.5 font-display">
					<Bot class="w-4 h-4 text-blue-700" /> Solo Gemini (da valutare)
				</span>
				<span class="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5">
					{artGroup.onlyGemini.length} {artGroup.onlyGemini.length === 1 ? 'relazione' : 'relazioni'}
				</span>
			</div>

			{#each artGroup.onlyGemini as rel, gIdx (`gOnly_${artGroup.articleNum}_${gIdx}`)}
				{@const relKey = getRelKey(rel, `gemini_${artGroup.articleNum}`, gIdx)}
				<RelationCard
					{rel}
					{relKey}
					index={gIdx + 1}
					editedRel={editedRelations[relKey]}
					decision={relationDecisions[relKey] || 'pending'}
					theme="blue"
					articleTitle={artGroup.itemTitle && artGroup.itemSubtitle ? `${artGroup.itemTitle} — ${artGroup.itemSubtitle}` : artGroup.itemTitle || artGroup.itemSubtitle || ''}
					articleText={artGroup.articleText || ''}
					{allLocalWorksets}
					{articles}
					{currentJobTitle}
					{isUpdatesTask}
					{onToggleDecision}
					{onStartEdit}
				/>
			{/each}
		</div>
	{/if}

	<!-- LISTA CANDIDATI TESTUALI ESCLUSI DALL'AI MA RILEVATI EURISTICAMENTE -->
	{#if artGroup.missingCandidates.length > 0}
		<div class="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-2">
			<span class="text-xs font-bold text-amber-950 flex items-center gap-1.5 pb-1">
				<ShieldAlert class="w-4 h-4 text-amber-700" /> Candidati testuali esclusi da entrambi i modelli:
			</span>
			<div class="space-y-2">
				{#each artGroup.missingCandidates as c, mIdx (`missing_${artGroup.articleNum}_${mIdx}`)}
					<div class="p-2 bg-white rounded-lg border border-amber-200 text-xs flex items-center justify-between gap-2">
						<div class="min-w-0">
							<span class="font-bold text-stone-900 block font-mono">
								"{c.text}"
							</span>
							<span class="text-[10px] text-stone-500">{c.label || 'Candidato'}</span>
						</div>
						<Badge variant="amber">Escluso</Badge>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- LEGENDA BOTTOM FOOTER (Come nell'immagine di riferimento) -->
	<div class="mt-4 p-3 bg-[#FAF6F0] border border-purple-200/60 rounded-xl flex items-center justify-between text-xs flex-wrap gap-3">
		<div class="flex items-center gap-3 text-[11px] text-stone-700 font-bold flex-wrap">
			<span class="text-[#7A2222] font-extrabold flex items-center gap-1">
				<Info class="w-3.5 h-3.5 text-[#7A2222]" /> Legenda:
			</span>
			<span class="flex items-center gap-1 text-stone-700 font-semibold">
				🏛️ Sorgente (chi modifica)
			</span>
			<span class="flex items-center gap-1 text-stone-700 font-semibold">
				🎯 Target (abrogato/rinviato)
			</span>
			<span class="flex items-center gap-1 text-stone-700 font-semibold">
				🟢 Tipo di relazione
			</span>
			<span class="flex items-center gap-1 text-stone-700 font-semibold">
				💬 Testo estratto dalla disposizione
			</span>
		</div>

		<div class="flex items-center gap-2 text-[11px]">
			<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100/80 text-amber-900 border border-amber-300">
				Esterno • Broken Link
			</span>
			<span class="text-stone-500 italic text-[10px]">Necessita di scaricamento</span>
		</div>
	</div>
</div>
