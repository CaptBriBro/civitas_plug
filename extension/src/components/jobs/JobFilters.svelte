<script lang="ts">
	import { Search, RefreshCw, BookOpen, History, Layers } from 'lucide-svelte';
	import { jobsStore } from '@/stores/jobs.svelte';
	import Button from '@/components/ui/Button.svelte';
</script>

<div class="space-y-2.5">
	<div class="flex items-center gap-2 flex-wrap">
		<div class="relative flex-1 min-w-[200px]">
			<Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
			<input
				bind:value={jobsStore.search}
				placeholder="Cerca un codice o una legge…"
				class="w-full rounded-xl border border-[#E7DFD5] bg-white pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#7A2222]"
			/>
		</div>

		<label class="flex items-center gap-2 text-[11px] font-semibold text-[#57534E] cursor-pointer">
			<input
				type="checkbox"
				bind:checked={jobsStore.downloadableOnly}
				onchange={() => jobsStore.load()}
				class="accent-[#7A2222] cursor-pointer"
			/>
			Solo scaricabili
		</label>

		<Button size="sm" variant="outline" onclick={() => jobsStore.load()} disabled={jobsStore.loading}>
			<RefreshCw class="w-3.5 h-3.5 {jobsStore.loading ? 'animate-spin' : ''}" /> Aggiorna
		</Button>
	</div>

	<!-- FILTRI RAPIDI PER TIPOLOGIA TASK -->
	<div class="flex items-center gap-1.5 flex-wrap">
		<span class="text-[11px] font-semibold text-[#78716C] mr-1">Tipologia:</span>
		
		<button
			type="button"
			onclick={() => (jobsStore.selectedTaskType = 'ALL')}
			class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 {jobsStore.selectedTaskType === 'ALL' ? 'bg-[#7A2222] text-white shadow-2xs' : 'bg-white border border-[#E7DFD5] text-[#57534E] hover:bg-[#FAF6F0]'}"
		>
			<Layers class="w-3 h-3" /> Tutti ({jobsStore.jobs.length})
		</button>

		<button
			type="button"
			onclick={() => (jobsStore.selectedTaskType = 'DOWNLOAD_ARTICLES')}
			class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 {jobsStore.selectedTaskType === 'DOWNLOAD_ARTICLES' ? 'bg-[#7A2222] text-white shadow-2xs' : 'bg-white border border-[#E7DFD5] text-[#57534E] hover:bg-[#FAF6F0]'}"
		>
			<BookOpen class="w-3 h-3" /> Articoli Normativi
		</button>

		<button
			type="button"
			onclick={() => (jobsStore.selectedTaskType = 'ACT_UPDATES')}
			class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 {jobsStore.selectedTaskType === 'ACT_UPDATES' ? 'bg-[#7A2222] text-white shadow-2xs' : 'bg-white border border-[#E7DFD5] text-[#57534E] hover:bg-[#FAF6F0]'}"
		>
			<History class="w-3 h-3 text-amber-700" /> Aggiornamenti Atto
		</button>
	</div>
</div>
