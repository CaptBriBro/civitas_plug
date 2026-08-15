<script lang="ts">
	import { worksetStore } from '@/stores/workset.svelte';
	import type { WorksetStats } from '@/domain/workset';

	const ZERO_STATS: WorksetStats = {
		articles: 0,
		withCandidates: 0,
		batches: 0,
		imported: 0,
		relations: 0
	};

	// Prima del primo download non esiste ancora un workset: si mostra comunque
	// il report a zero, così la struttura del riepilogo è visibile da subito
	// invece di apparire solo dopo aver premuto "Scarica articoli".
	let stats = $derived(worksetStore.stats ?? ZERO_STATS);

	const tiles = [
		{ key: 'articles', label: 'Articoli' },
		{ key: 'withCandidates', label: 'Con rinvii' },
		{ key: 'batches', label: 'Batch' },
		{ key: 'imported', label: 'Importati' },
		{ key: 'relations', label: 'Relazioni' }
	] as const;
</script>

<div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
	{#each tiles as tile (tile.key)}
		{@const isAi = tile.key === 'imported' || tile.key === 'relations'}
		<div
			class="rounded-2xl p-3 border shadow-xs {isAi
				? 'bg-purple-50/70 border-purple-200'
				: 'bg-white border-[#E7DFD5]'}"
		>
			<p
				class="text-[10px] font-bold uppercase tracking-widest {isAi
					? 'text-purple-800'
					: 'text-[#78716C]'}"
			>
				{tile.label}
			</p>
			<p class="font-display text-xl font-bold mt-0.5 {isAi ? 'text-purple-950' : 'text-[#1C1917]'}">
				{stats[tile.key]}
			</p>
		</div>
	{/each}
</div>
