<script lang="ts">
	import { ArrowLeft, X, Layers, ChevronDown, ChevronUp, BookOpen } from 'lucide-svelte';
	import ArticleText from '@/components/article/ArticleText.svelte';
	import ProviderButtons from '@/components/prompt/ProviderButtons.svelte';
	import ResponseImport from '@/components/results/ResponseImport.svelte';
	import ParsedPreview from '@/components/results/ParsedPreview.svelte';
	import Alert from '@/components/ui/Alert.svelte';
	import Button from '@/components/ui/Button.svelte';
	import Spinner from '@/components/ui/Spinner.svelte';
	import { worksetStore } from '@/stores/workset.svelte';
	import { router } from '@/router.svelte';

	interface Props {
		jobId: string;
		batchId: string;
	}

	let { jobId, batchId }: Props = $props();

	let batch = $derived(worksetStore.workset?.batches.find((b) => b.id === batchId));
	let articles = $derived(batch ? worksetStore.articlesOf(batch) : []);
	let articlesExpanded = $state(false);

	$effect(() => {
		if (worksetStore.workset?.jobId !== jobId) void worksetStore.load(jobId);
	});
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto"
	onclick={(e) => {
		if (e.target === e.currentTarget) router.toJob(jobId);
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape') router.toJob(jobId);
	}}
	role="dialog"
	aria-modal="true"
	tabindex="-1"
>
	<div class="w-full my-auto transition-all duration-300 max-h-[92vh] max-w-4xl flex flex-col">
		<div class="bg-white rounded-2xl w-full max-h-[92vh] flex flex-col border border-[#E7DFD5] shadow-2xl overflow-hidden min-w-0">
			
			<!-- Modal Header -->
			<div class="p-5 border-b border-[#E7DFD5] bg-[#FAF6F0] flex items-start justify-between gap-4 shrink-0">
				<div>
					<div class="flex items-center gap-2 mb-1">
						<div class="p-1.5 rounded-lg bg-purple-100 text-purple-900 border border-purple-300">
							<Layers class="w-4 h-4" />
						</div>
						<h2 class="text-lg font-bold font-display text-[#7A2222]">
							{batch ? `Batch ${batch.id}` : 'Dettaglio Batch'}
						</h2>
					</div>
					<p class="text-xs text-[#78716C]">
						{articles.length} {articles.length === 1 ? 'articolo' : 'articoli'} · {worksetStore.workset?.jobTitle || ''}
					</p>
				</div>

				<button
					onclick={() => router.toJob(jobId)}
					class="p-1.5 rounded-xl text-[#78716C] hover:text-[#1C1917] hover:bg-[#E7DFD5]/50 transition-all cursor-pointer"
					aria-label="Chiudi"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Modal Body (Scrollable) -->
			<div class="p-6 space-y-5 overflow-y-auto flex-1 text-left">
				{#if worksetStore.loading}
					<div class="flex items-center gap-2 text-xs text-[#78716C] py-10 justify-center">
						<Spinner /> Caricamento del batch…
					</div>
				{:else if !batch}
					<Alert tone="error" message="Batch non trovato: potrebbe essere stato rigenerato." />
				{:else}
					{#if worksetStore.error}
						<Alert tone="error" message={worksetStore.error} />
					{/if}

					<!-- FISARMONICA ARTICOLI INCLUSI NEL BATCH (NORMALE CHIUSO) -->
					<div class="border border-[#E7DFD5] rounded-xl bg-[#FAF6F0] overflow-hidden shadow-2xs">
						<button
							type="button"
							onclick={() => (articlesExpanded = !articlesExpanded)}
							class="w-full p-3.5 flex items-center justify-between font-bold text-xs text-[#7A2222] hover:bg-[#F5EBE6] transition-colors cursor-pointer"
						>
							<span class="flex items-center gap-2">
								<BookOpen class="w-4 h-4 text-[#7A2222]" />
								Articoli inclusi nel Batch ({articles.length})
								{#if batch.articleNumbers.length > 0}
									<span class="text-[11px] font-mono text-stone-500 font-normal">
										(artt. {batch.articleNumbers.join(', ')})
									</span>
								{/if}
							</span>
							{#if articlesExpanded}
								<ChevronUp class="w-4 h-4 text-[#7A2222]" />
							{:else}
								<ChevronDown class="w-4 h-4 text-[#7A2222]" />
							{/if}
						</button>

						{#if articlesExpanded}
							<div class="p-4 border-t border-[#E7DFD5] bg-white space-y-2 max-h-[320px] overflow-y-auto animate-in fade-in">
								{#each articles as article (article.numero)}
									<ArticleText {article} />
								{/each}
							</div>
						{/if}
					</div>

					<ProviderButtons {batch} />

					<ResponseImport {batch} />

					<ParsedPreview relations={batch.relations} />
				{/if}
			</div>

			<!-- Modal Footer -->
			<div class="border-t border-[#E7DFD5] bg-[#FAF6F0] p-4 flex items-center justify-between gap-3 shrink-0">
				<Button variant="outline" size="sm" onclick={() => router.toJob(jobId)}>
					<ArrowLeft class="w-3.5 h-3.5" /> Torna all'attività
				</Button>
			</div>

		</div>
	</div>
</div>
