<script lang="ts">
	import { settingsStore } from '@/stores/settings.svelte';
	import { authStore } from '@/stores/auth.svelte';

	type Tone = 'offline' | 'linked' | 'guest';

	let tone = $derived<Tone>(
		settingsStore.connectionError ? 'offline' : authStore.isLinked ? 'linked' : 'guest'
	);

	const labels: Record<Tone, string> = {
		offline: 'Server non raggiungibile',
		linked: 'Collegato',
		guest: 'Modalità ospite'
	};

	const dots: Record<Tone, string> = {
		offline: 'bg-rose-500',
		linked: 'bg-emerald-500',
		guest: 'bg-amber-500'
	};
</script>

<span class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#57534E]">
	<span class="w-1.5 h-1.5 rounded-full {dots[tone]}"></span>
	{labels[tone]}
</span>
