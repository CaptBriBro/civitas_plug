<script lang="ts">
	import { onMount } from 'svelte';
	import { ExternalLink, LayoutDashboard, PanelRight, Settings } from 'lucide-svelte';
	import BrandHeader from '@/components/layout/BrandHeader.svelte';
	import ConnectionBadge from '@/components/layout/ConnectionBadge.svelte';
	import EnvSelector from '@/components/settings/EnvSelector.svelte';
	import JobCountSummary from '@/components/jobs/JobCountSummary.svelte';
	import Button from '@/components/ui/Button.svelte';
	import Alert from '@/components/ui/Alert.svelte';
	import { settingsStore } from '@/stores/settings.svelte';
	import { authStore } from '@/stores/auth.svelte';
	import { jobsStore } from '@/stores/jobs.svelte';
	import { openDashboard, openSidePanel } from '@/services/browser/browserService';
	import { getBrowserId } from '@/config/version';

	let showSidePanelButton = getBrowserId() === 'chrome';

	// Il popup resta una vetrina: il lavoro vero si fa nella dashboard o nel pannello laterale.
	onMount(() => {
		void (async () => {
			await settingsStore.load();
			await authStore.load();
			await jobsStore.load();
		})();

		return authStore.watch();
	});
</script>

<main class="flex flex-col min-h-[460px] bg-[#FAF6F0]">
	<BrandHeader compact subtitle={authStore.displayName} />

	<div class="flex-1 p-4 space-y-4">
		<ConnectionBadge />

		{#if settingsStore.connectionError}
			<Alert tone="error" message={settingsStore.connectionError}>
				<Button size="sm" variant="outline" onclick={() => settingsStore.probeServer()}>
					Riprova
				</Button>
			</Alert>
		{:else}
			<JobCountSummary />
		{/if}

		<EnvSelector compact />
	</div>

	<footer class="p-4 pt-0 space-y-2">
		<Button full size="lg" onclick={() => openDashboard()}>
			<LayoutDashboard class="w-4 h-4" /> Apri l'area di lavoro
		</Button>

		{#if showSidePanelButton}
			<Button
				full
				size="sm"
				variant="outline"
				onclick={async () => {
					if (await openSidePanel()) window.close();
				}}
			>
				<PanelRight class="w-3.5 h-3.5" /> Apri come pannello laterale
			</Button>
		{/if}

		<div class="flex gap-2">
			<Button full size="sm" variant="outline" onclick={() => openDashboard('#/settings')}>
				<Settings class="w-3.5 h-3.5" /> Impostazioni
			</Button>
			{#if !authStore.isLinked}
				<Button full size="sm" variant="ai" onclick={() => openDashboard('#/link')}>
					<ExternalLink class="w-3.5 h-3.5" /> Collega account
				</Button>
			{/if}
		</div>
	</footer>
</main>
