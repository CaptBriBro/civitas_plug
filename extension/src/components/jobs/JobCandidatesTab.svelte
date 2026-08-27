<script lang="ts">
	import {
		Search,
		Layers,
		RefreshCw,
		CheckCircle2,
		Clock,
		Sparkles,
		FileText,
		BarChart3,
		GitCompare,
		ChevronRight,
		ChevronDown,
		ChevronUp
	} from 'lucide-svelte';
	import Badge from '@/components/ui/Badge.svelte';
	import Button from '@/components/ui/Button.svelte';
	import EmptyState from '@/components/ui/EmptyState.svelte';
	import Alert from '@/components/ui/Alert.svelte';
	import { worksetStore } from '@/stores/workset.svelte';
	import { settingsStore } from '@/stores/settings.svelte';
	import { router } from '@/router.svelte';
	import { openSidePanel } from '@/services/browser/browserService';
	import { saveActiveBatchSelection } from '@/services/storage/worksetStore';
	import { broadcast } from '@/messaging/messages';
	import type { Workset, WorksetBatch } from '@/domain/workset';
	import { normalize } from '@/parser/normalization';
	import { analyzeArticle } from '@/parser/referenceParser';

	interface Props {
		workset: Workset | null;
		jobId: string;
	}

	let { workset, jobId }: Props = $props();

	let articles = $derived(workset?.articles || []);
	let batches = $derived(workset?.batches || []);

	let expandedCandidateId = $state<string | null>(null);

	// Dimensione batch: mostra il default dalle impostazioni, modificabile prima di rigenerare
	let batchSizeOverride = $state<number | null>(null);
	let batchSizeValue = $derived(batchSizeOverride ?? settingsStore.effectiveBatchSize);
	let hasImportedBatches = $derived(batches.some((b) => b.status === 'imported'));
	let showRegenerateChoice = $state(false);

	function handleRegenerateClick() {
		if (batches.length > 0 && hasImportedBatches) {
			showRegenerateChoice = true;
			return;
		}
		void worksetStore.regenerateBatches({ batchSize: batchSizeValue, keepImported: true });
	}

	function confirmRegenerate(keepImported: boolean) {
		showRegenerateChoice = false;
		void worksetStore.regenerateBatches({ batchSize: batchSizeValue, keepImported });
	}

	// Tutti i candidati estratti dal parser
	let allCandidates = $derived.by(() => {
		const result: Array<{
			id: string;
			articleNum: string;
			text: string;
			fullArticleText: string;
			start?: number;
			end?: number;
			label: string;
			type: string;
			confidence: number;
			assignedBatchId: string | null;
			batchStatus?: string;
		}> = [];

		for (const art of articles) {
			const artNum = art.numero.startsWith('Art.') ? art.numero : `Art. ${art.numero}`;
			
			// Esegue il parsing dinamico così da mostrare sempre i candidati aggiornati
			const analysis = analyzeArticle(art.testo, { ownNumero: art.numero });
			const candidates = analysis.candidates || [];

			for (const c of candidates) {
				const numClean = art.numero.replace(/[^0-9]/g, '');

				const assignedBatch = batches.find((b) =>
					b.articleNumbers.some((n) => n.replace(/[^0-9]/g, '') === numClean)
				);

				result.push({
					id: `${art.numero}_${c.id || c.text}_${result.length}`,
					articleNum: artNum,
					text: c.text,
					fullArticleText: art.testo,
					start: c.start,
					end: c.end,
					label: c.label || 'Candidato Testuale',
					type: c.type || 'article_reference',
					confidence: Math.round((c.confidence || art.candidateScore || 0.75) * 100),
					assignedBatchId: assignedBatch ? assignedBatch.id : null,
					batchStatus: assignedBatch ? assignedBatch.status : undefined
				});
			}
		}

		return result;
	});

	async function handleOpenBatch(batch: WorksetBatch) {
		await worksetStore.load(jobId);
		await saveActiveBatchSelection({ jobId, batchId: batch.id });
		broadcast({ type: 'SELECT_BATCH', jobId, batchId: batch.id });
		void openSidePanel();
	}

	function handleGoToComparison(batch: WorksetBatch) {
		router.toBatchCompare(jobId, batch.id);
	}

	async function handleCandidateClick(c: any) {
		expandedCandidateId = expandedCandidateId === c.id ? null : c.id;
		if (c.assignedBatchId) {
			await worksetStore.load(jobId);
			await saveActiveBatchSelection({ jobId, batchId: c.assignedBatchId });
			broadcast({ type: 'SELECT_BATCH', jobId, batchId: c.assignedBatchId });
		}
	}
</script>

<div class="space-y-6 py-2">
	<!-- BOX GENERAZIONE BATCH & RAGGRUPPAMENTI IN CIMA -->
	<div class="p-5 rounded-2xl bg-white border border-[#E7DFD5] shadow-xs space-y-4">
		<div class="flex items-center justify-between gap-3 flex-wrap border-b border-[#E7DFD5] pb-3">
			<div>
				<h2 class="font-display text-base font-bold text-[#7A2222] flex items-center gap-2">
					<Layers class="w-5 h-5 text-[#7A2222]" /> Batch di Analisi per Modelli AI (ChatGPT / Gemini)
				</h2>
				<p class="text-xs text-[#78716C] mt-0.5">
					Suddivide gli articoli contenenti candidati euristici in batch ottimizzati per la risoluzione via AI.
				</p>
			</div>
			<div class="flex items-center gap-2">
				<label class="flex items-center gap-1.5 text-[11px] font-semibold text-[#57534E]">
					Articoli/batch
					<input
						type="number"
						min="1"
						class="w-14 px-2 py-1.5 text-xs font-mono font-bold text-center rounded-lg border border-[#E7DFD5] bg-white text-[#1C1917] focus:outline-none focus:border-[#7A2222]"
						value={batchSizeValue}
						oninput={(e) => (batchSizeOverride = Math.max(1, Number(e.currentTarget.value) || 1))}
					/>
				</label>
				<Button size="sm" variant="outline" onclick={handleRegenerateClick}>
					<RefreshCw class="w-3.5 h-3.5" />
					{batches.length > 0 ? 'Rigenera Batch' : 'Genera Batch'}
				</Button>
			</div>
		</div>

		{#if worksetStore.error}
			<Alert tone="error" message={worksetStore.error} />
		{/if}

		{#if batches.length === 0}
			<EmptyState
				message="Nessun batch generato. Premi «Genera Batch» per suddividere e raggruppare i candidati trovati."
			/>
		{:else}
			<div class="grid gap-3 sm:grid-cols-2">
				{#each batches as batch (batch.id)}
					{@const hasData = Boolean(
						batch.rawResponseChatGPT ||
						batch.rawResponseGemini ||
						batch.rawResponse ||
						(batch.relations && batch.relations.length > 0) ||
						batch.status === 'imported' ||
						batch.status === 'awaiting_ai'
					)}
					<div class="p-4 bg-[#FAF6F0] rounded-xl border border-[#E7DFD5] space-y-2.5">
						<div class="flex items-center justify-between">
							<span class="font-display font-bold text-sm text-[#7A2222]">
								📦 Batch {batch.id}
							</span>
							{#if batch.status === 'imported'}
								<Badge variant="green">✅ Approvato & Importato</Badge>
							{:else if hasData}
								<Badge variant="purple">💬 Risposte AI Presenti</Badge>
							{:else}
								<Badge variant="amber">⏳ Da Analizzare</Badge>
							{/if}
						</div>
						<p class="text-xs text-[#57534E]">
							{batch.articleNumbers.length} articoli compresi: artt. {batch.articleNumbers.join(', ')}
						</p>
						<div class="pt-2 flex flex-col sm:flex-row gap-2">
							<Button
								variant="ai"
								size="sm"
								class="flex-1"
								onclick={() => handleOpenBatch(batch)}
							>
								<BarChart3 class="w-4 h-4" /> Sidebar
							</Button>

							<Button
								variant={hasData && batch.status !== 'imported' ? 'purple' : 'outline'}
								size="sm"
								class="flex-1"
								onclick={() => handleGoToComparison(batch)}
							>
								<GitCompare class="w-4 h-4" />
								{batch.status === 'imported'
									? 'Vedi Confronto'
									: hasData
									? '🔍 Apri Confronto'
									: 'Confronto'}
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- TABELLA / ELENCO DETTAGLIATO DEI CANDIDATI EURISTICI RILEVATI -->
	<div class="space-y-3">
		<div class="flex items-center justify-between flex-wrap gap-2 border-b border-[#E7DFD5] pb-2">
			<h3 class="font-display text-sm font-bold text-[#1C1917] flex items-center gap-2">
				<Search class="w-4 h-4 text-purple-700" />
				Elenco Possibili Riferimenti Trovati nel Testo dal Parser Euristico ({allCandidates.length})
			</h3>
			<Badge variant="purple">Punteggi di Confidenza & Tipologia</Badge>
		</div>

		{#if allCandidates.length === 0}
			<EmptyState message="Nessun candidato euristico individuato nel testo degli articoli scaricati." />
		{:else}
			<div class="bg-white rounded-2xl border border-[#E7DFD5] shadow-xs overflow-hidden">
				<div class="divide-y divide-[#E7DFD5]">
					{#each allCandidates as c (c.id)}
						{@const isExpanded = expandedCandidateId === c.id}
						<div
							onclick={() => handleCandidateClick(c)}
							onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCandidateClick(c); } }}
							role="button"
							tabindex="0"
							class="p-3.5 hover:bg-[#FAF6F0] transition-colors flex flex-col gap-3 text-xs border-b border-[#E7DFD5] last:border-b-0 cursor-pointer text-left focus:outline-none focus:bg-[#FAF6F0]"
						>
							<div class="flex items-center justify-between gap-4 flex-wrap w-full">
								<div class="min-w-0 flex-1 space-y-1">
									<div class="flex items-center gap-2 flex-wrap">
										<span class="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-[#7A2222] text-white">
											📌 {c.articleNum}
										</span>
										{#if c.assignedBatchId}
											<Badge variant="stone">📦 Batch {c.assignedBatchId}</Badge>
										{/if}
										<Badge variant="purple">{c.type}</Badge>
									</div>
									<p class="font-mono font-bold text-stone-900 text-xs pt-1">
										"{c.text}"
									</p>
									<p class="text-[10px] text-stone-500">{c.label}</p>
								</div>

								<div class="flex items-center gap-3">
									<div class="text-right font-mono">
										<span class="font-bold text-xs text-[#7A2222]">{c.confidence}%</span>
										<span class="text-[10px] text-stone-400 block">confidenza</span>
									</div>
									{#if isExpanded}
										<ChevronUp class="w-4 h-4 text-stone-400" />
									{:else}
										<ChevronDown class="w-4 h-4 text-stone-400" />
									{/if}
								</div>
							</div>

							{#if isExpanded}
								<div class="mt-1 p-3 bg-[#FAF6F0] rounded-xl border border-[#E7DFD5] space-y-2 animate-in fade-in">
									<div class="flex items-center justify-between text-[11px] text-stone-600 font-semibold border-b border-[#E7DFD5] pb-1.5">
										<span>Contesto nel Testo dell'Articolo</span>
										<span class="font-mono text-purple-700 font-bold">{c.articleNum}</span>
									</div>
									<p class="text-stone-850 font-serif leading-relaxed text-xs">
										{c.fullArticleText}
									</p>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
	{/if}
	</div>

	{#if showRegenerateChoice}
		<div class="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in font-sans">
			<div class="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95">
				<div class="px-6 pt-6 pb-3">
					<h3 class="text-base font-bold text-stone-900 leading-tight">Rigenerare i Batch?</h3>
				</div>
				<div class="px-6 py-2">
					<p class="text-xs text-stone-700 leading-relaxed font-serif">
						Alcuni batch sono già stati <strong>approvati & importati</strong>. Vuoi rigenerare solo i batch
						non ancora completati, oppure rifare da capo anche quelli già validati (le relazioni approvate
						in quei batch andranno perse)?
					</p>
				</div>
				<div class="px-6 py-4 bg-stone-50 border-t border-stone-100 flex flex-col gap-2 mt-3">
					<button
						type="button"
						onclick={() => confirmRegenerate(true)}
						class="w-full px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs bg-emerald-700 hover:bg-emerald-800 text-white"
					>
						Solo i batch non completati
					</button>
					<button
						type="button"
						onclick={() => confirmRegenerate(false)}
						class="w-full px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs bg-rose-700 hover:bg-rose-800 text-white"
					>
						Rigenera anche i batch già validati
					</button>
					<button
						type="button"
						onclick={() => (showRegenerateChoice = false)}
						class="w-full px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-white border border-stone-250 hover:bg-stone-100 transition-colors cursor-pointer"
					>
						Annulla
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
