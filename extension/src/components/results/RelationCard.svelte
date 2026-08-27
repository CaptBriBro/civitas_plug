<script lang="ts">
	import type { ExtractedRelation } from '../../domain/workset';
	import type { LegalArticle } from '../../domain/article';
	import { getRelationLinkStatus } from '../../utils/relationUtils';

	interface Props {
		rel: ExtractedRelation;
		relKey: string;
		index?: number;
		editedRel?: ExtractedRelation;
		decision?: 'approved' | 'rejected' | 'pending';
		theme?: 'emerald' | 'purple' | 'blue';
		articleTitle?: string;
		articleText?: string;
		allLocalWorksets?: Array<{ jobId: string; jobTitle: string }>;
		articles?: LegalArticle[];
		currentJobTitle?: string;
		isUpdatesTask?: boolean;
		onToggleDecision: (relKey: string, status: 'approved' | 'rejected') => void;
		onStartEdit: (relKey: string, rel: ExtractedRelation, title: string, text: string) => void;
	}

	let {
		rel,
		relKey,
		index,
		editedRel,
		decision = 'pending',
		theme = 'emerald',
		articleTitle = '',
		articleText = '',
		allLocalWorksets = [],
		articles = [],
		currentJobTitle = '',
		isUpdatesTask = false,
		onToggleDecision,
		onStartEdit
	}: Props = $props();

	let currentRel = $derived(editedRel || rel);

	let cardBorderClass = $derived.by(() => {
		if (decision === 'approved') {
			return 'border-emerald-300 ring-1 ring-emerald-300/50 bg-emerald-50/10';
		}
		if (decision === 'rejected') {
			return 'border-stone-200 opacity-60 bg-stone-50/30';
		}
		if (theme === 'purple') return 'border-purple-200';
		if (theme === 'blue') return 'border-blue-200';
		return 'border-emerald-200';
	});

	let srcLinkStatusInfo = $derived(getRelationLinkStatus(currentRel, true, allLocalWorksets, articles, currentJobTitle, isUpdatesTask));
	let tgtLinkStatusInfo = $derived(getRelationLinkStatus(currentRel, false, allLocalWorksets, articles, currentJobTitle, isUpdatesTask));
</script>

<div class="bg-white border rounded-2xl overflow-hidden shadow-xs mb-3 transition-all duration-200 {cardBorderClass}">
	<!-- GRIGLIA PRINCIPALE 4 COLONNE (SORGENTE, TARGET, RELAZIONE, TESTO ESTRATTO DALLA DISPOSIZIONE) -->
	<div class="grid grid-cols-12 divide-x divide-stone-100 text-xs items-stretch">
		
		<!-- Colonna 1: SORGENTE (Chi Modifica) -->
		<div class="col-span-4 p-4 space-y-3 min-w-0 flex flex-col justify-between">
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					{#if index !== undefined}
						<span class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px] flex items-center justify-center shrink-0">
							{index}
						</span>
					{/if}
					<span class="px-2.5 py-0.5 rounded-md text-[9px] font-extrabold tracking-wider bg-amber-100/80 text-amber-900 uppercase">
						SORGENTE (Chi Modifica)
					</span>
				</div>

				<div class="flex items-start gap-2 pt-0.5">
					<span class="text-base leading-none shrink-0 mt-0.5">🏛️</span>
					<div class="min-w-0 w-full space-y-1">
						{#if currentRel.source_act && typeof currentRel.source_act === 'object'}
							<span class="font-bold text-indigo-950 text-sm leading-tight block truncate">
								{currentRel.source_act.type || ''} n. {currentRel.source_act.number || '—'} ({currentRel.source_act.year || '—'})
							</span>
							{#if currentRel.source_act.article}
								<span class="text-xs text-stone-600 font-mono block">{currentRel.source_act.article}</span>
							{/if}
						{:else if currentRel.source_article}
							<span class="font-bold text-indigo-950 font-mono text-sm block">Art. {currentRel.source_article}</span>
						{:else}
							<span class="text-stone-600 font-mono text-xs block">{articleTitle || 'Sorgente generica'}</span>
						{/if}

						<!-- Riga Link Sorgente esplicita -->
						<div class="pt-0.5">
							<span class="px-2 py-0.5 rounded-full text-[10px] font-bold border leading-snug inline-flex items-center gap-1
								{srcLinkStatusInfo.type === 'broken'
									? 'bg-amber-100/80 text-amber-900 border-amber-300'
									: srcLinkStatusInfo.type === 'downloaded' || srcLinkStatusInfo.type === 'internal'
									? 'bg-stone-100 text-stone-700 border-stone-250'
									: 'bg-emerald-100/80 text-emerald-900 border-emerald-300'}">
								🔗 Link Sorgente: {srcLinkStatusInfo.label}
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Stato e Tasti Azione su due livelli (Da valutare sopra, Modifica/Approva/Rifiuta sotto) -->
			<div class="space-y-1.5 pt-2">
				<!-- Livello 1: Stato Corrente (Da valutare / Approvato / Rifiutato) -->
				<div>
					{#if decision === 'approved'}
						<button
							type="button"
							onclick={() => onToggleDecision(relKey, 'approved')}
							class="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600 text-white shadow-2xs cursor-pointer inline-flex items-center gap-1"
						>
							✓ Approvato
						</button>
					{:else if decision === 'rejected'}
						<button
							type="button"
							onclick={() => onToggleDecision(relKey, 'rejected')}
							class="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-rose-600 text-white shadow-2xs cursor-pointer inline-flex items-center gap-1"
						>
							✕ Rifiutato
						</button>
					{:else}
						<span class="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100/90 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
							⚖️ Da valutare
						</span>
					{/if}
				</div>

				<!-- Livello 2: Tasti di Azione (Modifica, Approva, Rifiuta) -->
				<div class="flex items-center gap-1.5 flex-wrap">
					<button
						type="button"
						onclick={() => onStartEdit(relKey, rel, articleTitle, articleText)}
						class="px-2 py-1 rounded-lg text-[10px] font-semibold bg-white text-stone-700 border border-stone-250 hover:bg-stone-50 cursor-pointer flex items-center gap-1"
					>
						📄 Modifica
					</button>
					<button
						type="button"
						onclick={() => onToggleDecision(relKey, 'approved')}
						class="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 cursor-pointer flex items-center gap-1"
					>
						✓ Approva
					</button>
					<button
						type="button"
						onclick={() => onToggleDecision(relKey, 'rejected')}
						class="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 cursor-pointer flex items-center gap-1"
					>
						✕ Rifiuta
					</button>
				</div>
			</div>
		</div>

		<!-- Colonna 2: TARGET (Abrogato/Rinviato) -->
		<div class="col-span-3 p-4 space-y-2 min-w-0">
			<span class="px-2.5 py-0.5 rounded-md text-[9px] font-extrabold tracking-wider bg-emerald-100/80 text-emerald-900 uppercase inline-block">
				TARGET (Abrogato/Rinviato)
			</span>
			<div class="flex items-start gap-2.5 pt-0.5">
				<span class="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
					🎯
				</span>
				<div class="min-w-0 space-y-1 w-full">
					<span class="font-bold text-stone-900 font-mono text-base leading-tight block">
						Art. {currentRel.target_article || 'Rinvio'}
						{#if currentRel.target_paragraph}
							<span class="text-xs font-normal text-stone-500 ml-1">· comma {currentRel.target_paragraph}</span>
						{/if}
					</span>

					<!-- Explicit target act title -->
					<span class="text-[10px] text-stone-600 font-sans block truncate font-medium leading-snug">
						{tgtLinkStatusInfo.type === 'internal' && currentJobTitle
							? `🏛️ ${currentJobTitle}`
							: currentRel.source_article || 'Atto Principale'}
					</span>

					<!-- Uniform Link Status Badge -->
					<div class="inline-block pt-0.5">
						<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border leading-snug inline-flex items-center gap-1
							{tgtLinkStatusInfo.type === 'broken'
								? 'bg-amber-100/80 text-amber-900 border-amber-300'
								: tgtLinkStatusInfo.type === 'downloaded' || tgtLinkStatusInfo.type === 'internal'
								? 'bg-stone-100 text-stone-700 border-stone-250'
								: 'bg-emerald-100/80 text-emerald-900 border-emerald-300'}">
							{tgtLinkStatusInfo.label}
						</span>
					</div>

					{#if editedRel}
						<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-md border bg-blue-50 text-blue-750 border-blue-200 block w-max mt-1">
							✍️ Modificato
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Colonna 3: RELAZIONE -->
		<div class="col-span-2 p-4 flex flex-col items-center justify-center min-w-[90px] text-center">
			<span class="block text-[9px] font-extrabold uppercase tracking-wider text-stone-400 text-center mb-2 w-full">
				RELAZIONE
			</span>
			<span class="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100/80 text-emerald-900 border border-emerald-250">
				{currentRel.family || 'AMENDMENT'} / {currentRel.relation_type || 'ABROGATION'}
			</span>
		</div>

		<!-- Colonna 4: TESTO ESTRATTO DALLA DISPOSIZIONE (EVIDENZA) -->
		<div class="col-span-3 p-4 space-y-2 min-w-0 bg-stone-50/20">
			<span class="block text-[9px] font-extrabold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
				💬 TESTO ESTRATTO DALLA DISPOSIZIONE
			</span>
			<div class="space-y-1.5">
				{#if currentRel.evidence}
					<p class="text-xs text-stone-700 italic font-serif leading-relaxed line-clamp-4">
						"{currentRel.evidence}"
					</p>
				{:else}
					<span class="text-[10px] text-stone-400 italic">Nessuna evidenza testuale estratta</span>
				{/if}
			</div>
		</div>
	</div>
</div>
