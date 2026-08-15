<script lang="ts">
	import { onMount } from 'svelte';
	import JobFilters from '@/components/jobs/JobFilters.svelte';
	import JobCard from '@/components/jobs/JobCard.svelte';
	import Alert from '@/components/ui/Alert.svelte';
	import EmptyState from '@/components/ui/EmptyState.svelte';
	import Spinner from '@/components/ui/Spinner.svelte';
	import Button from '@/components/ui/Button.svelte';
	import { jobsStore } from '@/stores/jobs.svelte';
	import { router } from '@/router.svelte';

	onMount(() => {
		void jobsStore.load();
	});
</script>

<div class="space-y-5">
	<div>
		<h1 class="font-display text-2xl font-bold text-[#7A2222]">Attività Civitas</h1>
		<p class="text-xs text-[#78716C] mt-1">
			Il catalogo è pubblico: puoi scaricare gli articoli e preparare le analisi anche senza
			collegare l'account.
		</p>
	</div>

	<JobFilters />

	{#if jobsStore.error}
		<Alert tone="error" message={jobsStore.error}>
			<Button size="sm" variant="outline" onclick={() => jobsStore.load()}>Riprova</Button>
		</Alert>
	{:else if jobsStore.loading}
		<div class="flex items-center gap-2 text-xs text-[#78716C] py-10 justify-center">
			<Spinner /> Caricamento del catalogo…
		</div>
	{:else if jobsStore.filtered.length === 0}
		<EmptyState message="Nessuna attività corrisponde ai filtri impostati." />
	{:else}
		<div class="grid gap-2 sm:grid-cols-2">
			{#each jobsStore.filtered as job (job.id)}
				<JobCard
					{job}
					started={jobsStore.startedJobIds.has(job.id)}
					onopen={(selected) => router.toJob(selected.id)}
				/>
			{/each}
		</div>
	{/if}
</div>
