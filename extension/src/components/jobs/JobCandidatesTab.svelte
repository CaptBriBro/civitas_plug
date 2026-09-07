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
		ChevronUp,
		Settings,
		Info,
		X,
		SlidersHorizontal
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
	import { candidateArticles } from '@/features/results/batching';

	interface Props {
		workset: Workset | null;
		jobId: string;
	}

	let { workset, jobId }: Props = $props();

	let articles = $derived(workset?.articles || []);
	let batches = $derived(workset?.batches || []);

	let expandedCandidateId = $state<string | null>(null);

	// Dimensione batch personalizzabile con memoria
	let batchSizeOverride = $state<number | null>(null);
	let batchSizeValue = $derived(batchSizeOverride ?? settingsStore.effectiveBatchSize);

	// Riconoscimento se è un task di aggiornamenti/novelle o di articoli standard
	let isUpdatesTask = $derived(Boolean(workset?.actUpdates && workset.actUpdates.length > 0));
	let itemLabelSingle = $derived(isUpdatesTask ? 'novella/modifica' : 'articolo');
	let itemLabelPlural = $derived(isUpdatesTask ? 'novelle/modifiche' : 'articoli');

	// Calcolo degli elementi eleggibili totali
	let totalEligibleCount = $derived.by(() => {
		if (!workset) return 0;
		if (isUpdatesTask) {
			return workset.actUpdates?.length || 0;
		}
		return candidateArticles(articles, settingsStore.settings.candidateThreshold).length;
	});

	// Batch già importati/approvati
	let importedBatches = $derived(batches.filter((b) => b.status === 'imported'));
	let hasImportedBatches = $derived(importedBatches.length > 0);
	let importedArticlesSet = $derived(new Set(importedBatches.flatMap((b) => b.articleNumbers)));

	// Elementi rimanenti se si conservano i batch già importati
	let remainingCount = $derived.by(() => {
		if (!workset) return 0;
		if (isUpdatesTask) {
			return (workset.actUpdates || []).filter((_, idx) => !importedArticlesSet.has(String(idx))).length;
		}
		const candidates = candidateArticles(articles, settingsStore.settings.candidateThreshold);
		return candidates.filter((art) => !importedArticlesSet.has(art.numero)).length;
	});

	// Impostazione di conservazione nel modal
	let keepImportedSetting = $state(true);
	let showRegenerateModal = $state(false);

	// Simulazione in tempo reale di quanti batch verrebbero
	let activeTargetCount = $derived(keepImportedSetting && hasImportedBatches ? remainingCount : totalEligibleCount);
	let predictedFreshBatches = $derived(Math.ceil(activeTargetCount / Math.max(1, batchSizeValue)));
	let predictedTotalBatches = $derived((keepImportedSetting && hasImportedBatches ? importedBatches.length : 0) + predictedFreshBatches);

	let fullBatchesCount = $derived(Math.floor(activeTargetCount / Math.max(1, batchSizeValue)));
	let remainderItemsCount = $derived(activeTargetCount % Math.max(1, batchSizeValue));

	function setBatchSize(size: number) {
		batchSizeOverride = size;
		void settingsStore.update({ batchSize: size });
	}

	function handleConfirmRegenerate() {
		showRegenerateModal = false;
		void worksetStore.regenerateBatches({
			batchSize: batchSizeValue,
			keepImported: keepImportedSetting
		});
		void settingsStore.update({ batchSize: batchSizeValue });
	}

	function formatBatchNumbers(numbers: string[]): string {
		if (!numbers || numbers.length === 0) return '';
		if (numbers.length <= 6) return numbers.join(', ');
		return `${numbers.slice(0, 3).join(', ')} ... ${numbers.slice(-2).join(', ')} (${numbers.length} tot.)`;
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
		<div class="flex items-center justify-between gap-4 flex-wrap border-b border-[#E7DFD5] pb-3.5">
			<div>
				<h2 class="font-display text-base font-bold text-[#7A2222] flex items-center gap-2">
					<Layers class="w-5 h-5 text-[#7A2222]" /> Batch di Analisi per Modelli AI (ChatGPT / Gemini)
				</h2>
				<p class="text-xs text-[#78716C] mt-0.5">
					{isUpdatesTask
						? 'Suddivide le novelle e modifiche storiche in batch ottimizzati per l\'analisi automatica via AI.'
						: 'Suddivide gli articoli contenenti candidati euristici in batch ottimizzati per la risoluzione via AI.'}
				</p>
			</div>

			<!-- Quick Batch Size Controller & Simulator Badge -->
			<div class="flex items-center gap-2.5 flex-wrap">
				<div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E7DFD5] bg-[#FAF6F0] text-xs">
					<span class="text-[#57534E] font-medium text-[11px]">{itemLabelPlural} per batch:</span>
					<div class="flex items-center gap-1">
						{#each [5, 10, 25, 50] as preset}
							<button
								type="button"
								onclick={() => setBatchSize(preset)}
								class="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono transition-all cursor-pointer {batchSizeValue === preset ? 'bg-[#7A2222] text-white shadow-2xs' : 'bg-white text-[#57534E] hover:bg-[#F5EBE6] border border-[#E7DFD5]'}"
								title="Imposta {preset} {itemLabelPlural} per batch"
							>
								{preset}
							</button>
						{/each}
						<input
							type="number"
							min="1"
							class="w-12 px-1.5 py-0.5 text-xs font-mono font-bold text-center rounded-md border border-[#E7DFD5] bg-white text-[#1C1917] focus:outline-none focus:border-[#7A2222]"
							value={batchSizeValue}
							oninput={(e) => setBatchSize(Math.max(1, Number(e.currentTarget.value) || 1))}
							title="Valore personalizzato"
						/>
					</div>

					<span class="text-[11px] font-bold text-[#7A2222] font-mono pl-1.5 border-l border-[#E7DFD5] flex items-center gap-1" title="Batch che verrebbero creati con la dimensione attuale">
						➔ {predictedTotalBatches} batch
					</span>
				</div>

				<Button size="sm" variant="outline" onclick={() => (showRegenerateModal = true)}>
					<SlidersHorizontal class="w-3.5 h-3.5" />
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
							{#if isUpdatesTask}
								{@const humanNumbers = batch.articleNumbers.map((n) => isNaN(Number(n)) ? n : String(Number(n) + 1))}
								{batch.articleNumbers.length} novelle comprese: progr. {formatBatchNumbers(humanNumbers)}
							{:else}
								{batch.articleNumbers.length} articoli compresi: artt. {formatBatchNumbers(batch.articleNumbers)}
							{/if}
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
						<!-- svelte-ignore a11y_interactive_supports_focus -->
						<div
							role="button"
							tabindex="0"
							onclick={() => handleCandidateClick(c)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handleCandidateClick(c);
								}
							}}
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
									<p class="text-[10px] text-stone-500">
										{c.label}
									</p>
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

							<!-- Anteprima del testo completo se espanso -->
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

	<!-- MODAL DI CONFIGURAZIONE & RIGENERAZIONE BATCH -->
	{#if showRegenerateModal}
		<div class="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in font-sans">
			<div class="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 space-y-0">
				
				<!-- Header Modal -->
				<div class="px-6 py-4 border-b border-stone-200 bg-[#FAF6F0] flex items-center justify-between">
					<div class="flex items-center gap-2">
						<SlidersHorizontal class="w-4 h-4 text-[#7A2222]" />
						<h3 class="text-sm font-bold text-[#7A2222]">Configura e Rigenera i Batch</h3>
					</div>
					<button
						type="button"
						onclick={() => (showRegenerateModal = false)}
						class="p-1 rounded-lg text-stone-500 hover:bg-stone-200 transition-colors"
					>
						<X class="w-4 h-4" />
					</button>
				</div>

				<!-- Body Modal -->
				<div class="p-6 space-y-5 text-xs">
					
					<!-- 1. Definizione Dimensione Batch -->
					<div class="space-y-2">
						<span class="block font-bold text-stone-900 text-xs">
							1. Quanti {itemLabelPlural} inserire in ciascun batch?
						</span>
						<p class="text-[11px] text-stone-500">
							Scegli un preset rapido o digita un numero personalizzato per regolare le dimensioni dei prompt inviati ai modelli AI.
						</p>

						<div class="flex items-center gap-2 flex-wrap pt-1">
							{#each [5, 10, 15, 20, 25, 50, 100] as preset}
								<button
									type="button"
									onclick={() => setBatchSize(preset)}
									class="px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer {batchSizeValue === preset ? 'bg-[#7A2222] text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-250'}"
								>
									{preset}
								</button>
							{/each}
						</div>

						<div class="flex items-center gap-2 pt-2">
							<span class="text-stone-600 font-medium">Oppure valore personalizzato:</span>
							<input
								type="number"
								min="1"
								max={totalEligibleCount || 10000}
								class="w-20 px-3 py-1.5 text-xs font-mono font-bold text-center rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-[#7A2222]"
								value={batchSizeValue}
								oninput={(e) => setBatchSize(Math.max(1, Number(e.currentTarget.value) || 1))}
							/>
							<span class="text-stone-500 text-[11px]">{itemLabelPlural} per batch</span>
						</div>
					</div>

					<!-- 2. Anteprima Dinamica Calcolata: Quanti Batch Verrebbero -->
					<div class="p-4 rounded-xl border transition-all {predictedTotalBatches > 100 ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-emerald-50 border-emerald-300 text-emerald-950'} space-y-2.5">
						<div class="flex items-center justify-between border-b border-black/10 pb-2">
							<span class="font-bold text-xs flex items-center gap-1.5">
								<Layers class="w-4 h-4" /> Anteprima Calcolo Batch
							</span>
							<span class="font-mono font-extrabold text-sm px-2.5 py-0.5 rounded-lg {predictedTotalBatches > 100 ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'}">
								{predictedTotalBatches} Batch Previsti
							</span>
						</div>

						<div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
							<div class="p-2 bg-white/70 rounded-lg border border-black/5">
								<span class="text-stone-500 block text-[10px] uppercase font-bold">Elementi Totali</span>
								<span class="font-mono font-bold text-stone-900">{totalEligibleCount} {itemLabelPlural}</span>
							</div>
							<div class="p-2 bg-white/70 rounded-lg border border-black/5">
								<span class="text-stone-500 block text-[10px] uppercase font-bold">Dimensione Scelta</span>
								<span class="font-mono font-bold text-stone-900">{batchSizeValue} per batch</span>
							</div>
							<div class="p-2 bg-white/70 rounded-lg border border-black/5 col-span-2 sm:col-span-1">
								<span class="text-stone-500 block text-[10px] uppercase font-bold">Nuovi Batch</span>
								<span class="font-mono font-bold text-stone-900">{predictedFreshBatches} da generare</span>
							</div>
						</div>

						<p class="text-[11px] font-serif leading-relaxed pt-1">
							⚡ <strong>Suddivisione:</strong> 
							{#if fullBatchesCount > 0}
								{fullBatchesCount} batch completi da {batchSizeValue} {itemLabelPlural}
							{/if}
							{#if remainderItemsCount > 0}
								{fullBatchesCount > 0 ? ', più ' : ''}1 batch finale con i rimanenti {remainderItemsCount} {itemLabelPlural}
							{/if}.
						</p>
					</div>

					<!-- 3. Gestione Batch Già Approvati (se presenti) -->
					{#if hasImportedBatches}
						<div class="space-y-2 p-3.5 bg-stone-50 rounded-xl border border-stone-200">
							<span class="block font-bold text-stone-800 text-xs">
								Gestione batch già importati ({importedBatches.length} batch completati):
							</span>
							<div class="space-y-1.5 text-[11px]">
								<label class="flex items-center gap-2 cursor-pointer">
									<input
										type="radio"
										name="keepImported"
										checked={keepImportedSetting}
										onchange={() => (keepImportedSetting = true)}
										class="text-emerald-600 focus:ring-emerald-500"
									/>
									<span><strong>Conserva i {importedBatches.length} batch già validati</strong> (consigliato: non perdi le relazioni già convalidate)</span>
								</label>

								<label class="flex items-center gap-2 cursor-pointer text-rose-800">
									<input
										type="radio"
										name="keepImported"
										checked={!keepImportedSetting}
										onchange={() => (keepImportedSetting = false)}
										class="text-rose-600 focus:ring-rose-500"
									/>
									<span><strong>Rigenera tutto da zero</strong> (i batch già validati andranno persi)</span>
								</label>
							</div>
						</div>
					{/if}

				</div>

				<!-- Footer Modal -->
				<div class="px-6 py-4 bg-[#FAF6F0] border-t border-stone-200 flex items-center justify-between gap-3">
					<button
						type="button"
						onclick={() => (showRegenerateModal = false)}
						class="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 transition-colors cursor-pointer"
					>
						Annulla
					</button>

					<button
						type="button"
						onclick={handleConfirmRegenerate}
						class="px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs bg-[#7A2222] hover:bg-[#5E1A1A] text-white flex items-center gap-2"
					>
						<RefreshCw class="w-3.5 h-3.5" />
						Conferma e Rigenera {predictedTotalBatches} Batch
					</button>
				</div>

			</div>
		</div>
	{/if}
</div>
