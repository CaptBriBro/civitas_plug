<script lang="ts">
	import {
		X,
		BarChart3,
		BookOpen,
		Sparkles,
		Link2,
		RefreshCw,
		Terminal,
		ChevronDown,
		ChevronUp,
		Layers,
		Clock,
		Search
	} from 'lucide-svelte';
	import DownloadProgress from '@/components/jobs/DownloadProgress.svelte';
	import JobReportTab from '@/components/jobs/JobReportTab.svelte';
	import JobArticlesTab from '@/components/jobs/JobArticlesTab.svelte';
	import JobCandidatesTab from '@/components/jobs/JobCandidatesTab.svelte';
	import JobReferencesTab from '@/components/jobs/JobReferencesTab.svelte';
	import JobLinkedLawsTab from '@/components/jobs/JobLinkedLawsTab.svelte';
	import BatchRow from '@/components/results/BatchRow.svelte';
	import SubmitPanel from '@/components/results/SubmitPanel.svelte';
	import Alert from '@/components/ui/Alert.svelte';
	import Badge from '@/components/ui/Badge.svelte';
	import Button from '@/components/ui/Button.svelte';
	import EmptyState from '@/components/ui/EmptyState.svelte';
	import Spinner from '@/components/ui/Spinner.svelte';
	import { jobsStore } from '@/stores/jobs.svelte';
	import { worksetStore } from '@/stores/workset.svelte';
	import { router } from '@/router.svelte';

	interface Props {
		jobId: string;
	}

	let { jobId }: Props = $props();

	let job = $derived(jobsStore.detail);
	let workset = $derived(worksetStore.workset);

	let activeTab = $state<'report' | 'articles' | 'candidates' | 'normative_references' | 'linked_laws'>('report');
	let showLogsFooter = $state(false);

	$effect(() => {
		const id = jobId;
		void jobsStore.loadDetail(id);
		void worksetStore.load(id);
		return worksetStore.listen(id);
	});

	let articlesCount = $derived(workset?.articles.length || 0);
	let batchesCount = $derived(workset?.batches.length || 0);
	let approvedBatches = $derived((workset?.batches || []).filter((b) => b.status === 'imported'));

	let candidatesCount = $derived.by(() => {
		if (!workset) return 0;
		return workset.articles.reduce((acc, a) => acc + (a.candidates?.length || 0), 0);
	});

	let approvedRelationsCount = $derived.by(() => {
		if (!workset) return 0;
		return approvedBatches.reduce((acc, b) => acc + (b.relations?.length || 0), 0);
	});

	let approvedLawsCount = $derived.by(() => {
		if (!workset) return 0;
		const set = new Set<string>();
		for (const b of approvedBatches) {
			for (const r of b.relations || []) {
				if (r.target_article) set.add(r.target_article);
			}
		}
		return set.size;
	});

	let progressPercent = $derived(worksetStore.progressPercent);
	let isCompleted = $derived(articlesCount > 0 && !worksetStore.downloading);
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto"
	onclick={(e) => {
		if (e.target === e.currentTarget) router.toJobs();
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape') router.toJobs();
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
						<h2 class="text-lg font-bold font-display text-[#7A2222]">{job?.title || 'Dettaglio Attività'}</h2>
						{#if job?.task_type}
							<Badge variant="terracotta">{job.task_type}</Badge>
						{/if}
					</div>
					{#if job?.description}
						<p class="text-xs text-[#57534E] font-serif italic">{job.description}</p>
					{/if}
					{#if job?.source?.urn}
						<p class="text-[10px] font-mono text-[#A8A29E] mt-0.5">{job.source.urn}</p>
					{/if}
				</div>

				<button
					onclick={() => router.toJobs()}
					class="p-1.5 rounded-xl text-[#78716C] hover:text-[#1C1917] hover:bg-[#E7DFD5]/50 transition-all cursor-pointer"
					aria-label="Chiudi"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Modal Body (Scrollable) -->
			<div class="p-6 space-y-6 overflow-y-auto flex-1">
				{#if jobsStore.detailLoading && !job}
					<div class="flex items-center gap-2 text-xs text-[#78716C] py-10 justify-center">
						<Spinner /> Caricamento dell'attività…
					</div>
				{:else if jobsStore.error}
					<Alert tone="error" message={jobsStore.error}>
						<Button size="sm" variant="outline" onclick={() => jobsStore.loadDetail(jobId)}>
							Riprova
						</Button>
					</Alert>
				{:else if job}
					<!-- BARRA DELLE SCHEDE / TAB BAR -->
					<div class="flex items-center gap-2 border-b border-[#E7DFD5] pb-2 overflow-x-auto">
						<button
							onclick={() => (activeTab = 'report')}
							class="px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer {activeTab === 'report' ? 'bg-[#7A2222] text-white shadow-2xs' : 'bg-[#FAF6F0] text-[#57534E] hover:bg-[#F5EBE6]'}"
						>
							<BarChart3 class="w-3.5 h-3.5 text-amber-500" /> Report & Sintesi
						</button>

						<button
							onclick={() => (activeTab = 'articles')}
							class="px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer {activeTab === 'articles' ? 'bg-[#7A2222] text-white shadow-2xs' : 'bg-[#FAF6F0] text-[#57534E] hover:bg-[#F5EBE6]'}"
						>
							<BookOpen class="w-3.5 h-3.5" /> Articoli Estratti ({articlesCount})
						</button>

						<!-- SCHEDA CANDIDATI & BATCH SUBITO DOPO ARTICOLI ESTRATTI -->
						<button
							onclick={() => (activeTab = 'candidates')}
							class="px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer {activeTab === 'candidates' ? 'bg-[#7A2222] text-white shadow-2xs' : 'bg-purple-100/70 text-purple-950 border border-purple-300/80 hover:bg-purple-200/80'}"
						>
							<Search class="w-3.5 h-3.5 text-purple-700" /> Candidati & Batch ({candidatesCount})
						</button>

						<button
							onclick={() => (activeTab = 'normative_references')}
							class="px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer {activeTab === 'normative_references' ? 'bg-[#7A2222] text-white shadow-2xs' : 'bg-sky-100/70 text-sky-900 border border-sky-300/80 hover:bg-sky-200/80'}"
						>
							<Sparkles class="w-3.5 h-3.5 text-sky-800" /> Rinvii & Relazioni Normative ({approvedRelationsCount})
						</button>

						<button
							onclick={() => (activeTab = 'linked_laws')}
							class="px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer {activeTab === 'linked_laws' ? 'bg-[#7A2222] text-white shadow-2xs' : 'bg-amber-100/70 text-amber-950 border border-amber-300/80 hover:bg-amber-200/80'}"
						>
							<Link2 class="w-3.5 h-3.5 text-amber-800" /> Leggi & Riferimenti Connessi ({approvedLawsCount})
						</button>
					</div>

					<!-- CONTENUTO DELLE SCHEDE -->
					{#if activeTab === 'report'}
						<JobReportTab
							{workset}
							downloading={worksetStore.downloading}
							onselecttab={(tab) => (activeTab = tab as any)}
							onstartai={() => {
								if (workset && workset.articles.length > 0 && batchesCount === 0) {
									void worksetStore.regenerateBatches();
								}
								activeTab = 'candidates';
							}}
						/>

						<DownloadProgress {jobId} onstart={() => worksetStore.startDownload(job)} />

						{#if workset && workset.articles.length > 0}
							<SubmitPanel />
						{/if}

					{:else if activeTab === 'articles'}
						<JobArticlesTab
							articles={workset?.articles || []}
							downloading={worksetStore.downloading}
							onstartdownload={() => worksetStore.startDownload(job)}
						/>

					{:else if activeTab === 'candidates'}
						<JobCandidatesTab {workset} {jobId} />

					{:else if activeTab === 'normative_references'}
						<JobReferencesTab {workset} />

					{:else if activeTab === 'linked_laws'}
						<JobLinkedLawsTab {workset} />
					{/if}
				{/if}
			</div>

			<!-- Modal Footer with Progress Bar & Collapsible Log Drawer -->
			{#if job}
				<div class="border-t border-[#E7DFD5] bg-[#FAF6F0] p-4 space-y-3 shrink-0">
					<div class="space-y-2">
						<div class="flex items-center justify-between text-xs font-semibold text-[#57534E]">
							<div class="flex items-center gap-2">
								<span class="flex items-center gap-1.5 font-bold text-[#7A2222]">
									<Clock class="w-3.5 h-3.5 text-[#7A2222]" /> Stato Avanzamento:
									{#if worksetStore.downloading}
										<RefreshCw class="w-3 h-3 animate-spin text-[#7A2222] ml-0.5" />
									{/if}
								</span>
								{#if isCompleted}
									<Badge variant="green">COMPLETATO LOCALE (100%)</Badge>
								{:else if worksetStore.downloading}
									<Badge variant="amber">IN ESECUZIONE ({progressPercent}%)</Badge>
								{:else}
									<Badge variant="amber">IN ATTESA (0%)</Badge>
								{/if}
							</div>

							<button
								type="button"
								onclick={() => (showLogsFooter = !showLogsFooter)}
								class="px-2.5 py-1 rounded-lg bg-white border border-[#E7DFD5] text-[#7A2222] hover:bg-stone-50 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-bold shadow-2xs"
							>
								<Terminal class="w-3.5 h-3.5 text-stone-600" />
								<span>Log di Esecuzione Task</span>
								{#if showLogsFooter}
									<ChevronUp class="w-3.5 h-3.5 text-[#7A2222]" />
								{:else}
									<ChevronDown class="w-3.5 h-3.5 text-[#7A2222]" />
								{/if}
							</button>
						</div>

						<div class="w-full bg-[#E7DFD5] h-2 rounded-full overflow-hidden shadow-inner">
							<div
								class="bg-[#7A2222] h-full transition-all duration-300 rounded-full"
								style="width: {progressPercent}%;"
							></div>
						</div>
					</div>

					{#if showLogsFooter}
						<div class="bg-[#1C1917] text-emerald-400 p-3.5 rounded-xl font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto border border-stone-800 shadow-inner animate-in fade-in">
							{#if workset?.progress}
								<pre class="whitespace-pre-wrap">Fetched: {workset.progress.fetched} / {workset.progress.total} articles. Last article: {workset.progress.lastArticle || 'N/A'}</pre>
							{:else}
								<span class="text-stone-500 italic">Nessun log di esecuzione registrato per questa attività.</span>
							{/if}
						</div>
					{/if}

					<div class="flex items-center justify-between gap-3 pt-2 border-t border-[#E7DFD5]">
						<Button variant="outline" size="sm" onclick={() => router.toJobs()}>Chiudi</Button>
					</div>
				</div>
			{/if}

		</div>
	</div>
</div>
