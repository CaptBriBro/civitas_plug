<script lang="ts">
	import Badge from '@/components/ui/Badge.svelte';
	import CandidateList from './CandidateList.svelte';
	import type { LegalArticle } from '@/domain/article';

	interface Props {
		article: LegalArticle;
	}

	let { article }: Props = $props();

	let expanded = $state(false);
	let testo = $derived(article?.testo ?? '');
	let isLong = $derived(testo.length > 600);
	let shown = $derived(expanded || !isLong ? testo : `${testo.slice(0, 600)}…`);
	let historical = $derived((article?.versions || []).filter((v) => !v.isCurrent));
	let score = $derived(article?.candidateScore ?? 1.0);
</script>

<div class="bg-white border border-[#E7DFD5] rounded-2xl p-4 shadow-xs space-y-3">
	<div class="flex items-start justify-between gap-3 flex-wrap">
		<div class="min-w-0">
			<h3 class="font-display text-sm font-semibold text-[#1C1917]">
				Articolo {article.numero}
				{#if article.rubrica}<span class="font-normal text-[#57534E]"> — {article.rubrica}</span>{/if}
			</h3>
			{#if article.unitPath && article.unitPath.length > 0}
				<p class="text-[10px] text-[#A8A29E] truncate">{article.unitPath.join(' › ')}</p>
			{/if}
		</div>
		<Badge variant={score >= 0.85 ? 'green' : 'amber'}>
			score {score.toFixed(2)}
		</Badge>
	</div>

	<p class="text-[11px] text-[#1C1917] leading-relaxed whitespace-pre-wrap">{shown}</p>

	{#if isLong}
		<button
			onclick={() => (expanded = !expanded)}
			class="text-[11px] font-semibold text-[#7A2222] hover:underline cursor-pointer"
		>
			{expanded ? 'Mostra meno' : 'Mostra tutto il testo'}
		</button>
	{/if}

	{#if historical.length > 0}
		<p class="text-[11px] text-indigo-700 font-semibold border-l-2 border-indigo-200 pl-2">
			{historical.length} versioni storiche disponibili
		</p>
	{/if}

	<CandidateList candidates={article.candidates} />
</div>
