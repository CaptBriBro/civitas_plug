<script lang="ts">
	import { ScrollText, FolderClock } from 'lucide-svelte';
	import { jobsStore } from '@/stores/jobs.svelte';
	import Spinner from '@/components/ui/Spinner.svelte';

	let started = $derived(jobsStore.startedJobIds.size);
</script>

<div class="grid grid-cols-2 gap-2">
	<div class="bg-white border border-[#E7DFD5] rounded-2xl p-3 shadow-xs">
		<div class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#78716C]">
			<ScrollText class="w-3 h-3" /> Da elaborare
		</div>
		<p class="font-display text-2xl font-bold text-[#1C1917] mt-1">
			{#if jobsStore.loading}
				<Spinner size={18} />
			{:else}
				{jobsStore.total}
			{/if}
		</p>
	</div>

	<div class="bg-white border border-[#E7DFD5] rounded-2xl p-3 shadow-xs">
		<div class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#78716C]">
			<FolderClock class="w-3 h-3" /> In lavorazione
		</div>
		<p class="font-display text-2xl font-bold text-[#1C1917] mt-1">{started}</p>
	</div>
</div>
