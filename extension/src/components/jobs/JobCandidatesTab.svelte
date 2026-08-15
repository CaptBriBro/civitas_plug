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
		ChevronRight
	} from 'lucide-svelte';
	import Badge from '@/components/ui/Badge.svelte';
	import Button from '@/components/ui/Button.svelte';
	import EmptyState from '@/components/ui/EmptyState.svelte';
	import Alert from '@/components/ui/Alert.svelte';
	import { worksetStore } from '@/stores/workset.svelte';
	import { openSidePanel } from '@/services/browser/browserService';
	import type { Workset, WorksetBatch } from '@/domain/workset';

	interface Props {
		workset: Workset | null;
		jobId: string;
	}

	let { workset, jobId }: Props = $props();

	let articles = $derived(workset?.articles || []);
	let batches = $derived(workset?.batches || []);

	// Tutti i candidati estratti dal parser durante lo scaricamento
	let allCandidates = $derived.by(() => {
		const result: Array<{
			id: string;
			articleNum: string;
			text: string;
			label: string;
			type: string;
			confidence: number;
			assignedBatchId: string | null;
			batchStatus?: string;
		}> = [];

		for (const art of articles) {
			const artNum = art.numero.startsWith('Art.') ? art.numero : `Art. ${art.numero}`;
			for (const c of art.candidates || []) {
				const numClean = art.numero.replace(/[^0-9]/g, '');

				const assignedBatch = batches.find((b) =>
					b.articleNumbers.some((n) => n.replace(/[^0-9]/g, '') === numClean)
				);

				result.push({
					id: `${art.numero}_${c.id || c.text}`,
					articleNum: artNum,
					text: c.text,
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
		void openSidePanel();
	}

	function getBadgeVariant(type: string): 'purple' | 'green' | 'amber' | 'stone' {
		switch (type) {
			case 'law_reference':
			case 'code_reference':
				return 'purple';
			case 'decree_reference':
				return 'green';
			default:
				return 'stone';
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
			<Button size="sm" variant="outline" onclick={() => worksetStore.regenerateBatches()}>
				<RefreshCw class="w-3.5 h-3.5" />
				{batches.length > 0 ? 'Rigenera Batch' : 'Genera Batch'}
			</Button>
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
					<div class="p-4 bg-[#FAF6F0] rounded-xl border border-[#E7DFD5] space-y-2">
						<div class="flex items-center justify-between">
							<span class="font-display font-bold text-sm text-[#7A2222]">
								📦 Batch {batch.id}
							</span>
							{#if batch.status === 'imported'}
								<Badge variant="green">✅ Approvato & Importato</Badge>
							{:else}
								<Badge variant="amber">⏳ Da Analizzare</Badge>
							{/if}
						</div>
						<p class="text-xs text-[#57534E]">
							{batch.articleNumbers.length} articoli compresi: artt. {batch.articleNumbers.join(', ')}
						</p>
						<div class="pt-2">
							<Button
								variant="ai"
								size="sm"
								full
								onclick={() => handleOpenBatch(batch)}
							>
								<BarChart3 class="w-4 h-4" /> 📊 Analizza & Riconcilia Batch {batch.id} nella Sidebar
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
						<div class="p-3.5 hover:bg-[#FAF6F0] transition-colors flex items-center justify-between gap-4 flex-wrap text-xs">
							<div class="min-w-0 flex-1 space-y-1">
								<div class="flex items-center gap-2 flex-wrap">
									<span class="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-[#7A2222] text-white">
										📌 {c.articleNum}
									</span>
									<span class="font-bold text-stone-900 font-serif">"{c.text}"</span>
									<Badge variant={getBadgeVariant(c.type)}>{c.label}</Badge>
								</div>
							</div>

							<div class="flex items-center gap-3 shrink-0 text-xs font-mono">
								<!-- SCORE DI CONFIDENZA -->
								<div class="flex items-center gap-1">
									<span class="text-[10px] text-stone-500 font-sans">Confidenza:</span>
									<span class="px-2 py-0.5 rounded-md font-bold text-xs {c.confidence >= 80 ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'}">
										{c.confidence}%
									</span>
								</div>

								<!-- BATCH ASSEGNATO -->
								{#if c.assignedBatchId}
									<span class="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 font-bold text-[11px]">
										📦 Batch {c.assignedBatchId}
									</span>
								{:else}
									<span class="text-[11px] text-stone-400 italic">Non assegnato</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
