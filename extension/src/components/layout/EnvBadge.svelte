<script lang="ts">
	import { FlaskConical } from 'lucide-svelte';
	import { settingsStore } from '@/stores/settings.svelte';
</script>

{#if settingsStore.isDev}
	<span
		title="Connesso a {settingsStore.apiBase}"
		class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-900 border border-amber-300"
	>
		<FlaskConical class="w-2.5 h-2.5" /> Dev
	</span>
{/if}
