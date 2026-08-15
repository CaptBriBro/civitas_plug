<script lang="ts">
	import Badge from '@/components/ui/Badge.svelte';
	import type { ExtractedRelation } from '@/domain/workset';

	interface Props {
		relations: ExtractedRelation[];
	}

	let { relations }: Props = $props();
</script>

{#if relations.length > 0}
	<div class="ai-surface rounded-2xl p-4 space-y-2">
		<h3 class="font-display text-sm font-semibold text-purple-950">
			Relazioni estratte ({relations.length})
		</h3>
		<p class="text-[11px] text-purple-900/80">
			Generate da un modello: verranno inviate a Civitas con la loro provenienza e sottoposte a
			review umana.
		</p>

		<div class="space-y-1.5 max-h-72 overflow-y-auto">
			{#each relations as relation, index (index)}
				<div class="rounded-xl bg-white border border-purple-200 p-2.5 space-y-1.5">
					<div class="flex items-center gap-2 flex-wrap">
						{#if relation.source_article}
							<Badge variant="purple">art. {relation.source_article}</Badge>
						{/if}
						<span class="text-purple-400 text-xs">→</span>
						{#if relation.target_article}
							<Badge variant="indigo">art. {relation.target_article}</Badge>
						{/if}
						{#if relation.family}
							<span class="text-[10px] font-bold uppercase tracking-wider text-purple-800">
								{relation.family}
							</span>
						{/if}
						{#if relation.confidence !== undefined}
							<Badge variant="stone">{Math.round(relation.confidence * 100)}%</Badge>
						{/if}
					</div>
					{#if relation.evidence}
						<p class="text-[11px] text-[#57534E] italic leading-relaxed">"{relation.evidence}"</p>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}
