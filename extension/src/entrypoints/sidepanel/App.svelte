<script lang="ts">
	import { onMount } from 'svelte';
	import { LayoutDashboard, ArrowLeft, Layers, ChevronDown, ChevronUp } from 'lucide-svelte';
	import BrandHeader from '@/components/layout/BrandHeader.svelte';
	import ConnectionBadge from '@/components/layout/ConnectionBadge.svelte';
	import ActivityCard from '@/components/jobs/ActivityCard.svelte';
	import ProviderButtons from '@/components/prompt/ProviderButtons.svelte';
	import ArticleText from '@/components/article/ArticleText.svelte';
	import ResponseImport from '@/components/results/ResponseImport.svelte';
	import Button from '@/components/ui/Button.svelte';
	import EmptyState from '@/components/ui/EmptyState.svelte';
	import Spinner from '@/components/ui/Spinner.svelte';
	import { activityStore } from '@/stores/activity.svelte';
	import { settingsStore } from '@/stores/settings.svelte';
	import { authStore } from '@/stores/auth.svelte';
	import { worksetStore } from '@/stores/workset.svelte';
	import { openDashboard } from '@/services/browser/browserService';
	import { onEvent } from '@/messaging/messages';
	import { saveActiveBatchSelection, watchActiveBatchSelection, getActiveBatchSelection } from '@/services/storage/worksetStore';
	import type { Workset, WorksetBatch } from '@/domain/workset';

	let selectedWorkset = $state<Workset | null>(null);
	let selectedBatchId = $state<string | null>(null);
	let batchExpanded = $state(false);

	let activeWorkset = $derived(worksetStore.workset || selectedWorkset);
	let isUpdatesTask = $derived(
		(activeWorkset?.actUpdates?.length || 0) > 0 ||
		activeWorkset?.jobTitle?.includes('Aggiornamenti')
	);

	let activeBatch = $derived.by(() => {
		if (!activeWorkset || !activeWorkset.batches || activeWorkset.batches.length === 0) return null;
		if (selectedBatchId) {
			return activeWorkset.batches.find((b) => b.id === selectedBatchId) ?? activeWorkset.batches[0];
		}
		return activeWorkset.batches[0];
	});

	let activeUpdates = $derived.by(() => {
		if (!activeWorkset || !activeBatch || !activeWorkset.actUpdates) return [];
		const wanted = new Set(activeBatch.articleNumbers);
		return activeWorkset.actUpdates.filter(
			(u, idx) => wanted.has(String(idx)) || (u.progr ? wanted.has(u.progr) : false)
		);
	});

	let activeArticles = $derived.by(() => {
		if (!activeWorkset || !activeBatch) return [];

		return activeBatch.articleNumbers.map((num) => {
			const numClean = num.replace(/[^0-9]/g, '');
			const existing = (activeWorkset.articles || []).find((a) => {
				const aNum = String(a.numero).replace(/[^0-9]/g, '');
				return aNum === numClean || String(a.numero) === num || num.includes(String(a.numero));
			});

			return existing ?? {
				jobId: activeWorkset.jobId,
				numero: num,
				testo: `Articolo ${num} (Testo in fase di acquisizione per il batch ${activeBatch?.id})`,
				rubrica: `Articolo ${num}`,
				candidateScore: 1.0,
				ordering: parseInt(numClean, 10) || 1,
				versions: [],
				unitPath: [],
				candidates: [],
				source: 'normattiva' as const,
				urn: activeWorkset.actUrn ?? '',
				fetchedAt: new Date().toISOString()
			};
		});
	});

	onMount(() => {
		void settingsStore.load();
		void authStore.load();
		const stopAuthWatch = authStore.watch();
		const stopPolling = activityStore.startPolling();

		// Leggi la selezione del batch attivo all'avvio
		void getActiveBatchSelection().then(async (selection) => {
			if (selection) {
				selectedBatchId = selection.batchId;
				await worksetStore.load(selection.jobId);
				selectedWorkset = worksetStore.workset;
			}
		});

		// Ascolta i cambiamenti di selezione del batch attivo
		const stopActiveBatchWatch = watchActiveBatchSelection(async (selection) => {
			if (selection) {
				selectedBatchId = selection.batchId;
				await worksetStore.load(selection.jobId);
				selectedWorkset = worksetStore.workset;
				batchExpanded = false;
			} else {
				selectedWorkset = null;
				selectedBatchId = null;
				batchExpanded = false;
				worksetStore.workset = null;
			}
		});

		// Ascolta i messaggi diretti per la selezione immediata
		const stopEventWatch = onEvent(async (event) => {
			if (event.type === 'SELECT_BATCH') {
				selectedBatchId = event.batchId;
				await worksetStore.load(event.jobId);
				selectedWorkset = worksetStore.workset;
				batchExpanded = false;
			}
		});

		return () => {
			stopAuthWatch();
			stopPolling();
			stopActiveBatchWatch();
			stopEventWatch();
		};
	});

	// Riferimento a funzioni definite nello script
	function openJob(workset: Workset): void {
		void openDashboard(`#/job/${encodeURIComponent(workset.jobId)}`);
	}

	function handleSelectBatch(workset: Workset, batch: WorksetBatch): void {
		selectedWorkset = workset;
		selectedBatchId = batch.id;
		batchExpanded = false;
		void worksetStore.load(workset.jobId);
		void saveActiveBatchSelection({ jobId: workset.jobId, batchId: batch.id });
	}

	function clearBatchSelection(): void {
		selectedWorkset = null;
		selectedBatchId = null;
		batchExpanded = false;
		worksetStore.workset = null;
		void saveActiveBatchSelection(null);
		void activityStore.refresh();
	}
</script>

<div class="min-h-screen flex flex-col bg-[#FAF6F0]">
	<BrandHeader compact subtitle={authStore.displayName}>
		{#snippet actions()}
			<ConnectionBadge />
		{/snippet}
	</BrandHeader>

	<main class="flex-1 p-4 space-y-3">
		{#if activeBatch && activeWorkset}
			<!-- VISTA BATCH SELEZIONATO -->
			<div class="space-y-3 animate-in fade-in">
				<!-- TASTO TORNA ALLE ATTIVITÀ SOPRA AL BATCH -->
				<div>
					<button
						onclick={clearBatchSelection}
						class="inline-flex items-center gap-2 text-xs font-semibold text-[#78716C] hover:text-[#7A2222] transition-colors cursor-pointer"
					>
						<ArrowLeft class="w-4 h-4" /> Torna alle attività
					</button>
				</div>

				<!-- BATCH CARD FISARMONICA -->
				<div class="border border-[#E7DFD5] rounded-2xl bg-white shadow-xs overflow-hidden">
					<button
						type="button"
						onclick={() => (batchExpanded = !batchExpanded)}
						class="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#FAF6F0] transition-colors cursor-pointer"
					>
						<div class="min-w-0 flex items-center gap-2">
							<div class="p-1.5 rounded-lg bg-purple-100 text-purple-900 border border-purple-300 shrink-0">
								<Layers class="w-4 h-4" />
							</div>
							<div class="min-w-0">
								<h2 class="font-display text-sm font-bold text-[#7A2222] truncate">
									Batch {activeBatch.id}
								</h2>
								<p class="text-[11px] text-[#78716C] truncate">
									{#if isUpdatesTask}
										{activeWorkset.jobTitle} ({activeUpdates.length} novelle/modifiche)
									{:else}
										{activeWorkset.jobTitle} ({activeBatch.articleNumbers.length} articoli: artt. {activeBatch.articleNumbers.join(', ')})
									{/if}
								</p>
							</div>
						</div>
						<div class="flex items-center gap-1 shrink-0 text-[#7A2222]">
							{#if batchExpanded}
								<ChevronUp class="w-4 h-4" />
							{:else}
								<ChevronDown class="w-4 h-4" />
							{/if}
						</div>
					</button>

					{#if batchExpanded}
						<div class="p-3.5 border-t border-[#E7DFD5] bg-[#FAF6F0] space-y-3 animate-in fade-in">
							<div class="space-y-2 max-h-72 overflow-y-auto pr-1">
								{#if isUpdatesTask}
									{#if activeUpdates.length === 0}
										<p class="text-xs text-[#78716C] italic p-2">Nessun aggiornamento presente nel batch.</p>
									{:else}
										{#each activeUpdates as update, idx (idx)}
											<div class="p-2.5 bg-white rounded-xl border border-[#E7DFD5] space-y-1 text-xs font-serif">
												<div class="flex items-center justify-between text-[11px] font-mono font-bold text-[#7A2222]">
													<span>Progr. {update.progr || idx + 1}</span>
													<span>{update.data_pubblicazione || ''}</span>
												</div>
												{#if update.atto_modificante}
													<div class="text-[11px] font-semibold text-stone-800">{update.atto_modificante}</div>
												{/if}
												<div class="text-[#57534E] leading-relaxed whitespace-pre-wrap">{update.testo_disposizione}</div>
											</div>
										{/each}
									{/if}
								{:else}
									{#if activeArticles.length === 0}
										<p class="text-xs text-[#78716C] italic p-2">Nessun articolo presente nel batch.</p>
									{:else}
										{#each activeArticles as article, idx (`${article.numero}_${idx}`)}
											<ArticleText {article} />
										{/each}
									{/if}
								{/if}
							</div>
						</div>
					{/if}
				</div>

				<!-- TASTI INVIA A CHATGPT / GEMINI / ENTRAMBI -->
				<ProviderButtons batch={activeBatch} />

				<!-- PANNELLI INCOLLA & ANALISI TEMPO REALE CHATGPT / GEMINI / CONFRONTO -->
				<ResponseImport batch={activeBatch} />
			</div>
		{:else}
			<!-- LISTA ATTIVITÀ IN CORSO -->
			<div class="flex items-center justify-between">
				<h2 class="font-display text-sm font-bold text-[#7A2222]">Attività in corso</h2>
				{#if activityStore.loading}
					<Spinner size={14} tone="muted" />
				{/if}
			</div>

			{#if activityStore.active.length === 0}
				<EmptyState message="Nessuna attività in corso al momento." />
			{:else}
				<div class="space-y-2">
					{#each activityStore.active as workset (workset.jobId)}
						<ActivityCard {workset} onopen={openJob} onselectbatch={handleSelectBatch} />
					{/each}
				</div>
			{/if}
		{/if}
	</main>

	<footer class="p-4 pt-0">
		<Button full size="lg" onclick={() => openDashboard()}>
			<LayoutDashboard class="w-4 h-4" /> Sfoglia tutte le attività
		</Button>
	</footer>
</div>
