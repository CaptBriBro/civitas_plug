<script lang="ts">
	import CandidateRow from './CandidateRow.svelte';
	import type { ReferenceCandidate } from '@/domain/candidate';

	interface Props {
		candidates?: ReferenceCandidate[];
	}

	let { candidates = [] }: Props = $props();
	let safeCandidates = $derived(candidates || []);
</script>

{#if safeCandidates.length > 0}
	<div class="space-y-1.5">
		<p class="text-[10px] font-bold uppercase tracking-widest text-[#78716C]">
			{safeCandidates.length} possibili riferimenti normativi
		</p>
		{#each safeCandidates.slice(0, 6) as candidate, idx (candidate.id || idx)}
			<CandidateRow {candidate} />
		{/each}
	</div>
{/if}
