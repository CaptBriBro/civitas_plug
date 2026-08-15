<script lang="ts">
	import { Server, Check } from 'lucide-svelte';
	import { API_PRESETS, type EnvId } from '@/config/env';
	import { settingsStore } from '@/stores/settings.svelte';
	import Button from '@/components/ui/Button.svelte';

	interface Props {
		/** Versione ridotta per il popup, senza campo personalizzato. */
		compact?: boolean;
	}

	let { compact = false }: Props = $props();

	let customUrl = $state('');
	let showCustom = $state(false);
	let switching = $state(false);

	async function choose(env: EnvId) {
		switching = true;
		try {
			await settingsStore.changeEnv(env);
			showCustom = false;
		} finally {
			switching = false;
		}
	}

	async function applyCustom() {
		if (!customUrl.trim()) return;
		switching = true;
		try {
			await settingsStore.changeEnv('custom', customUrl);
		} finally {
			switching = false;
		}
	}
</script>

<div class="space-y-2">
	<div class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#78716C]">
		<Server class="w-3 h-3" /> Ambiente
	</div>

	<div class="grid gap-1.5" class:grid-cols-2={compact}>
		{#each API_PRESETS as preset (preset.id)}
			<button
				onclick={() => choose(preset.id)}
				disabled={switching}
				title={preset.url}
				class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer disabled:opacity-60
				{settingsStore.env === preset.id
					? 'bg-[#7A2222] text-white border-[#7A2222] shadow-xs'
					: 'bg-white text-[#57534E] border-[#E7DFD5] hover:border-[#78716C]'}"
			>
				<span class="min-w-0">
					<span class="block text-xs font-semibold truncate">{preset.label}</span>
					{#if !compact}
						<span
							class="block text-[10px] truncate {settingsStore.env === preset.id
								? 'text-white/70'
								: 'text-[#A8A29E]'}"
						>
							{preset.url}
						</span>
					{/if}
				</span>
				{#if settingsStore.env === preset.id}
					<Check class="w-3.5 h-3.5 shrink-0" />
				{/if}
			</button>
		{/each}
	</div>

	{#if !compact}
		{#if showCustom || settingsStore.env === 'custom'}
			<div class="flex items-center gap-2">
				<input
					bind:value={customUrl}
					placeholder={settingsStore.env === 'custom' ? settingsStore.apiBase : 'https://…'}
					class="flex-1 rounded-xl border border-[#E7DFD5] bg-white px-3 py-2 text-[11px] font-mono focus:outline-none focus:border-[#7A2222]"
				/>
				<Button size="sm" variant="secondary" onclick={applyCustom} disabled={switching}>
					Applica
				</Button>
			</div>
		{:else}
			<button
				onclick={() => (showCustom = true)}
				class="text-[11px] font-semibold text-[#78716C] hover:text-[#7A2222] transition-colors cursor-pointer"
			>
				Endpoint personalizzato…
			</button>
		{/if}
	{/if}
</div>
