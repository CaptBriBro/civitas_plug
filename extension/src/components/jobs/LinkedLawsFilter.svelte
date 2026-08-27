<script lang="ts">
	interface Props {
		filterCategory: 'all' | 'repeal' | 'broken' | 'partial_broken' | 'active';
		totalCount: number;
		brokenCount: number;
		repealingCount: number;
		partialBrokenCount: number;
		activeCount: number;
		onSelectCategory: (cat: 'all' | 'repeal' | 'broken' | 'partial_broken' | 'active') => void;
	}

	let {
		filterCategory,
		totalCount,
		brokenCount,
		repealingCount,
		partialBrokenCount,
		activeCount,
		onSelectCategory
	}: Props = $props();
</script>

<div class="flex items-center gap-1.5 flex-wrap pt-1">
	<button
		onclick={() => onSelectCategory('all')}
		class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5
			{filterCategory === 'all' ? 'bg-[#7A2222] text-white shadow-2xs' : 'bg-white text-stone-700 border border-[#E7DFD5] hover:bg-[#FAF6F0]'}"
	>
		<span>Tutti ({totalCount})</span>
	</button>

	{#if brokenCount > 0}
		<button
			onclick={() => onSelectCategory('broken')}
			class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5
				{filterCategory === 'broken' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-white text-amber-900 border border-amber-300 hover:bg-amber-50'}"
		>
			<span>🚫 Broken Link ({brokenCount})</span>
		</button>
	{/if}

	{#if repealingCount > 0}
		<button
			onclick={() => onSelectCategory('repeal')}
			class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5
				{filterCategory === 'repeal' ? 'bg-purple-900 text-white shadow-2xs' : 'bg-white text-purple-900 border border-purple-300 hover:bg-purple-50'}"
		>
			<span>⚡ Atti Abroganti ({repealingCount})</span>
		</button>
	{/if}

	{#if partialBrokenCount > 0}
		<button
			onclick={() => onSelectCategory('partial_broken')}
			class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5
				{filterCategory === 'partial_broken' ? 'bg-stone-800 text-white shadow-2xs' : 'bg-white text-stone-800 border border-stone-300 hover:bg-stone-50'}"
		>
			<span>⚠️ Partial ({partialBrokenCount})</span>
		</button>
	{/if}

	{#if activeCount > 0}
		<button
			onclick={() => onSelectCategory('active')}
			class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5
				{filterCategory === 'active' ? 'bg-emerald-800 text-white shadow-2xs' : 'bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-50'}"
		>
			<span>✅ Vigenti ({activeCount})</span>
		</button>
	{/if}
</div>
