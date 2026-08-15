<script lang="ts">
	import { Download, ListChecks, ArrowRight, Link2, ChevronDown, ChevronUp, Sparkles, RefreshCw } from 'lucide-svelte';
	import Badge from '@/components/ui/Badge.svelte';
	import ProgressBar from '@/components/ui/ProgressBar.svelte';
	import Alert from '@/components/ui/Alert.svelte';
	import Spinner from '@/components/ui/Spinner.svelte';
	import { PROVIDER_LABELS } from '@/adapters/ai/selectors';
	import { startAnalysis } from '@/features/ai/providerFlow';
	import { rebuildBatches } from '@/features/results/batching';
	import { saveWorkset } from '@/services/storage/worksetStore';
	import { settingsStore } from '@/stores/settings.svelte';
	import { messageFor } from '@/services/api/errors';
	import type { ProviderId } from '@/domain/prompt';
	import type { Workset, WorksetBatch } from '@/domain/workset';

	interface Props {
		workset: Workset;
		onopen: (workset: Workset) => void;
		onselectbatch?: (workset: Workset, batch: WorksetBatch) => void;
	}

	let { workset, onopen, onselectbatch }: Props = $props();

	let isDownloading = $derived(workset.status === 'downloading');
	let importedBatches = $derived(workset.batches.filter((b) => b.status === 'imported').length);
	let downloadPercent = $derived(
		workset.progress.total > 0
			? Math.min(100, Math.round((workset.progress.fetched / workset.progress.total) * 100))
			: 0,
	);

	const statusLabel: Record<Workset['status'], string> = {
		empty: 'Da avviare',
		downloading: 'Scaricamento in corso',
		ready: 'Articoli pronti',
		in_progress: 'Analisi in corso',
		complete: 'Completato',
	};

	let totalCandidates = $derived(
		workset.articles.reduce((acc, a) => acc + (a.candidates?.length || 0), 0),
	);
	let canShowReferences = $derived(!isDownloading && (workset.batches.length > 0 || totalCandidates > 0));

	let expanded = $state(false);
	let generating = $state(false);
	let busyBatchId = $state<string | null>(null);
	let sendError = $state<string | null>(null);

	function rangeLabel(batch: WorksetBatch): string {
		return batch.articleNumbers.length === 1
			? `art. ${batch.articleNumbers[0]}`
			: `artt. ${batch.articleNumbers[0]}–${batch.articleNumbers[batch.articleNumbers.length - 1]}`;
	}

	async function generateBatches(): Promise<void> {
		generating = true;
		sendError = null;
		try {
			const batches = rebuildBatches(workset, {
				batchSize: settingsStore.effectiveBatchSize,
				threshold: settingsStore.settings.candidateThreshold,
			});
			const updated = await saveWorkset({ ...workset, batches, status: 'in_progress' });
			workset.batches = updated.batches;
			workset.status = updated.status;
			if (batches.length === 0) {
				sendError =
					`Nessun articolo supera la soglia attuale (${settingsStore.settings.candidateThreshold.toFixed(2)}). ` +
					'Abbassala nelle Impostazioni per generare i batch.';
			}
		} catch (err) {
			sendError = messageFor(err);
		} finally {
			generating = false;
		}
	}

	async function toggleExpanded(): Promise<void> {
		if (!expanded && workset.batches.length === 0 && totalCandidates > 0) {
			await generateBatches();
		}
		expanded = !expanded;
	}

	async function sendBatch(batch: WorksetBatch, provider: ProviderId): Promise<void> {
		busyBatchId = batch.id;
		sendError = null;
		try {
			await startAnalysis(workset, batch, provider);
		} catch (err) {
			sendError = messageFor(err);
		} finally {
			busyBatchId = null;
		}
	}
</script>

<div class="bg-white border border-[#E7DFD5] rounded-2xl shadow-xs overflow-hidden">
	<button
		onclick={() => onopen(workset)}
		class="w-full text-left p-3 hover:bg-[#FAF6F0]/60 transition-colors cursor-pointer group space-y-2"
	>
		<div class="flex items-start justify-between gap-2">
			<div class="min-w-0">
				<p class="text-xs font-semibold text-[#1C1917] truncate">{workset.jobTitle}</p>
				<Badge variant={isDownloading ? 'amber' : 'purple'}>{statusLabel[workset.status]}</Badge>
			</div>
			<ArrowRight
				class="w-3.5 h-3.5 shrink-0 mt-1 text-[#A8A29E] group-hover:text-purple-700 transition-colors"
			/>
		</div>

		{#if isDownloading}
			<div class="space-y-1">
				<p class="text-[10px] text-[#78716C] flex items-center gap-1">
					<Download class="w-3 h-3" />
					{workset.progress.fetched} / {workset.progress.total || '…'} articoli
					{#if workset.progress.lastArticle}· art. {workset.progress.lastArticle}{/if}
				</p>
				<ProgressBar value={downloadPercent} tone="ai" />
			</div>
		{:else}
			<p class="text-[10px] text-[#78716C] flex items-center gap-1">
				<ListChecks class="w-3 h-3" />
				{importedBatches} / {workset.batches.length} batch importati · {workset.articles.length} articoli
			</p>
		{/if}
	</button>

	{#if canShowReferences}
		<div class="border-t border-[#E7DFD5] px-3 py-2 bg-[#FAF6F0]/40">
			<div class="flex items-center gap-1.5">
				<button
					type="button"
					onclick={() => void toggleExpanded()}
					disabled={generating}
					class="flex-1 min-w-0 flex items-center justify-between text-[11px] font-bold text-purple-900 cursor-pointer disabled:cursor-wait"
				>
					<span class="flex items-center gap-1.5">
						{#if generating}
							<Spinner size={12} tone="ai" />
						{:else}
							<Link2 class="w-3.5 h-3.5 text-purple-700" />
						{/if}
						Rinvii trovati ({workset.batches.length > 0 ? workset.batches.length : totalCandidates})
					</span>
					{#if expanded}<ChevronUp class="w-3.5 h-3.5" />{:else}<ChevronDown class="w-3.5 h-3.5" />{/if}
				</button>

				{#if expanded && workset.batches.length > 0}
					<button
						type="button"
						title="Rigenera batch"
						disabled={generating}
						onclick={() => void generateBatches()}
						class="p-1 rounded-lg text-purple-700 hover:bg-purple-100 cursor-pointer disabled:opacity-50 disabled:cursor-wait shrink-0"
					>
						<RefreshCw class="w-3.5 h-3.5" />
					</button>
				{/if}
			</div>

			{#if expanded}
				<div class="space-y-1.5 pt-2">
					{#if sendError}
						<Alert tone="error" message={sendError} />
					{/if}

					{#each workset.batches as batch (batch.id)}
						{@const busy = busyBatchId === batch.id}
						<div class="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-[#E7DFD5] text-[11px]">
							<button
								type="button"
								onclick={() => onselectbatch?.(workset, batch)}
								class="min-w-0 text-left cursor-pointer hover:underline"
							>
								<p class="font-semibold text-[#1C1917] truncate">{batch.id} · {rangeLabel(batch)}</p>
								{#if batch.status === 'imported'}
									<Badge variant="green">Importato ({batch.relations.length})</Badge>
								{:else if batch.provider}
									<Badge variant="indigo">Inviato a {PROVIDER_LABELS[batch.provider]}</Badge>
								{:else}
									<Badge variant="stone">Da analizzare</Badge>
								{/if}
							</button>

							<div class="flex items-center gap-1 shrink-0">
								{#each ['chatgpt', 'gemini'] as provider (provider)}
									<button
										type="button"
										disabled={busy}
										onclick={() => {
											void sendBatch(batch, provider as ProviderId);
											onselectbatch?.(workset, batch);
										}}
										class="px-2 py-1 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 hover:bg-purple-100 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait flex items-center gap-1 font-semibold"
									>
										<Sparkles class="w-3 h-3" />
										{PROVIDER_LABELS[provider as ProviderId]}
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
