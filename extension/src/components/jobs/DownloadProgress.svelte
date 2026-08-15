<script lang="ts">
	import { Download, Ban } from 'lucide-svelte';
	import ProgressBar from '@/components/ui/ProgressBar.svelte';
	import Button from '@/components/ui/Button.svelte';
	import Alert from '@/components/ui/Alert.svelte';
	import { worksetStore } from '@/stores/workset.svelte';

	interface Props {
		jobId: string;
		onstart: () => void;
	}

	let { jobId, onstart }: Props = $props();

	let progress = $derived(worksetStore.workset?.progress);
</script>

<div class="bg-white border border-[#E7DFD5] rounded-2xl p-4 shadow-xs space-y-3">
	<div class="flex items-center justify-between gap-3 flex-wrap">
		<div>
			<h3 class="font-display text-sm font-semibold text-[#1C1917]">Acquisizione da Normattiva</h3>
			<p class="text-[11px] text-[#78716C]">
				{#if progress && progress.total > 0}
					{progress.fetched} di {progress.total} articoli
					{#if progress.lastArticle}· ultimo: art. {progress.lastArticle}{/if}
				{:else}
					Gli articoli vengono scaricati dal tuo browser, con il tuo indirizzo IP.
				{/if}
			</p>
		</div>

		{#if worksetStore.downloading}
			<Button size="sm" variant="outline" onclick={() => worksetStore.cancelDownload(jobId)}>
				<Ban class="w-3.5 h-3.5" /> Interrompi
			</Button>
		{:else}
			<Button size="sm" onclick={onstart}>
				<Download class="w-3.5 h-3.5" />
				{progress && progress.fetched > 0 ? 'Riprendi acquisizione' : 'Scarica articoli'}
			</Button>
		{/if}
	</div>

	{#if worksetStore.downloading || (progress && progress.fetched > 0)}
		<ProgressBar
			value={worksetStore.progressPercent}
			indeterminate={worksetStore.downloading && (!progress || progress.total === 0)}
		/>
	{/if}

	{#if progress?.error}
		<Alert tone="warning" message={progress.error} />
	{/if}
</div>
