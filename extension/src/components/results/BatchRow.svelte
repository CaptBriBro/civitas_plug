<script lang="ts">
	import { ArrowRight, CheckCircle2, CircleDashed, Sparkles, TriangleAlert } from 'lucide-svelte';
	import Badge from '@/components/ui/Badge.svelte';
	import { PROVIDER_LABELS } from '@/adapters/ai/selectors';
	import { openSidePanel } from '@/services/browser/browserService';
	import type { WorksetBatch } from '@/domain/workset';

	interface Props {
		batch: WorksetBatch;
		onopen: (batch: WorksetBatch) => void;
	}

	let { batch, onopen }: Props = $props();

	const statusMeta = {
		pending: { label: 'Da analizzare', variant: 'stone', Icon: CircleDashed },
		prompt_loading: { label: 'Preparazione prompt', variant: 'purple', Icon: Sparkles },
		prompt_ready: { label: 'Prompt pronto', variant: 'purple', Icon: Sparkles },
		awaiting_ai: { label: 'In attesa della risposta', variant: 'indigo', Icon: Sparkles },
		imported: { label: 'Importato', variant: 'green', Icon: CheckCircle2 },
		error: { label: 'Errore', variant: 'red', Icon: TriangleAlert }
	} as const;

	let meta = $derived(statusMeta[batch.status]);
	let range = $derived(
		batch.articleNumbers.length === 1
			? `art. ${batch.articleNumbers[0]}`
			: `artt. ${batch.articleNumbers[0]}–${batch.articleNumbers[batch.articleNumbers.length - 1]}`
	);

	function handleClick() {
		void openSidePanel();
		onopen(batch);
	}
</script>

<button
	onclick={handleClick}
	class="w-full text-left rounded-2xl border p-3 shadow-xs transition-colors cursor-pointer group
	{batch.status === 'imported'
		? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400'
		: 'bg-white border-[#E7DFD5] hover:border-purple-400'}"
>
	<div class="flex items-center justify-between gap-3">
		<div class="min-w-0">
			<p class="text-xs font-semibold text-[#1C1917]">
				{batch.id} · <span class="font-normal text-[#57534E]">{range}</span>
			</p>
			<div class="flex items-center gap-2 mt-1.5 flex-wrap">
				<Badge variant={meta.variant}>
					<meta.Icon class="w-3 h-3" />
					{meta.label}
				</Badge>
				{#if batch.provider}
					<Badge variant="purple">{PROVIDER_LABELS[batch.provider]}</Badge>
				{/if}
				{#if batch.relations.length > 0}
					<Badge variant="indigo">{batch.relations.length} relazioni</Badge>
				{/if}
			</div>
		</div>

		<ArrowRight
			class="w-4 h-4 shrink-0 text-[#A8A29E] group-hover:text-purple-700 transition-colors"
		/>
	</div>
</button>
