<script lang="ts">
	import { onMount } from 'svelte';
	import BrandHeader from '@/components/layout/BrandHeader.svelte';
	import Sidebar from '@/components/layout/Sidebar.svelte';
	import ConnectionBadge from '@/components/layout/ConnectionBadge.svelte';
	import JobsView from '@/views/JobsView.svelte';
	import JobView from '@/views/JobView.svelte';
	import BatchView from '@/views/BatchView.svelte';
	import BatchComparisonView from '@/views/BatchComparisonView.svelte';
	import LinkView from '@/views/LinkView.svelte';
	import SettingsView from '@/views/SettingsView.svelte';
	import { router } from '@/router.svelte';
	import { settingsStore } from '@/stores/settings.svelte';
	import { authStore } from '@/stores/auth.svelte';

	onMount(() => {
		const stopRouter = router.start();
		const stopAuthWatch = authStore.watch();

		void settingsStore.load();
		void authStore.load();

		return () => {
			stopRouter();
			stopAuthWatch();
		};
	});
</script>

<div class="min-h-screen flex flex-col bg-[#FAF6F0]">
	<BrandHeader subtitle={authStore.displayName}>
		{#snippet actions()}
			<ConnectionBadge />
		{/snippet}
	</BrandHeader>

	<div class="flex-1 flex min-h-0">
		<Sidebar />

		<main class="flex-1 min-w-0 overflow-y-auto p-6">
			<div class="max-w-5xl mx-auto">
				{#if router.route.name === 'jobs'}
					<JobsView />
				{:else if router.route.name === 'job' && router.route.jobId}
					<JobsView />
					<JobView jobId={router.route.jobId} />
				{:else if router.route.name === 'batch' && router.route.jobId && router.route.batchId}
					<JobsView />
					<JobView jobId={router.route.jobId} />
					<BatchView jobId={router.route.jobId} batchId={router.route.batchId} />
				{:else if router.route.name === 'batch-compare' && router.route.jobId && router.route.batchId}
					<BatchComparisonView jobId={router.route.jobId} batchId={router.route.batchId} />
				{:else if router.route.name === 'link'}
					<LinkView />
				{:else if router.route.name === 'settings'}
					<SettingsView />
				{/if}
			</div>
		</main>
	</div>
</div>
