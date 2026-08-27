<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchSystemPrompts, type SystemPrompt } from '@/services/api/endpoints/prompts';
	import { FileText, Copy, Check, ChevronDown, ChevronUp, RefreshCw } from 'lucide-svelte';
	import Badge from '@/components/ui/Badge.svelte';
	import Button from '@/components/ui/Button.svelte';
	import EmptyState from '@/components/ui/EmptyState.svelte';
	import Alert from '@/components/ui/Alert.svelte';

	interface PromptGroup {
		name: string;
		versions: SystemPrompt[];
		selectedVersionKey: string;
	}

	let promptGroups = $state<PromptGroup[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let copiedId = $state<string | null>(null);
	let expandedId = $state<string | null>(null);

	function groupPrompts(flatPrompts: SystemPrompt[]): PromptGroup[] {
		const map = new Map<string, SystemPrompt[]>();
		for (const p of flatPrompts) {
			const list = map.get(p.name) || [];
			list.push(p);
			map.set(p.name, list);
		}

		const groups: PromptGroup[] = [];
		for (const [name, list] of map.entries()) {
			if (list.length === 0) continue;
			
			// Ordina le versioni numericamente decrescenti (es. v2 prima di v1)
			list.sort((a, b) => {
				const aNum = parseInt(a.version.replace(/[^\d]/g, '')) || 0;
				const bNum = parseInt(b.version.replace(/[^\d]/g, '')) || 0;
				return bNum - aNum;
			});

			groups.push({
				name,
				versions: list,
				selectedVersionKey: list[0]!.key // La versione più recente selezionata di default
			});
		}

		// Ordina i gruppi alfabeticamente per nome del prompt
		groups.sort((a, b) => a.name.localeCompare(b.name));
		return groups;
	}

	async function loadPrompts() {
		loading = true;
		error = null;
		try {
			const res = await fetchSystemPrompts();
			promptGroups = groupPrompts(res.prompts || []);
		} catch (err: any) {
			error = err?.message || 'Impossibile connettersi al server per scaricare i prompt di sistema. Verifica che il server sia attivo.';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadPrompts();
	});

	async function handleCopy(text: string, id: string) {
		try {
			await navigator.clipboard.writeText(text);
			copiedId = id;
			setTimeout(() => {
				if (copiedId === id) copiedId = null;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy text: ', err);
		}
	}
</script>

<div class="space-y-5">
	<div class="flex items-start justify-between gap-4">
		<div>
			<div class="flex items-center gap-2 text-[#7A2222]">
				<FileText class="w-4 h-4" />
				<span class="text-[10px] font-bold uppercase tracking-widest">Server Civitas</span>
			</div>
			<h1 class="font-display text-2xl font-bold text-[#7A2222] mt-1">Prompt di Sistema</h1>
			<p class="text-xs text-[#78716C] mt-1">
				Qui sono elencati i prompt ufficiali scaricati dal backend, raggruppati per tipologia di attività.
			</p>
		</div>

		<Button
			variant="outline"
			size="sm"
			onclick={loadPrompts}
			disabled={loading}
			title="Sincronizza e scarica i prompt dal backend"
		>
			<RefreshCw class="w-3.5 h-3.5 {loading ? 'animate-spin' : ''}" />
			<span>Aggiorna</span>
		</Button>
	</div>

	{#if error}
		<Alert tone="error" message={error}>
			<Button size="sm" variant="outline" onclick={() => loadPrompts()}>Riprova</Button>
		</Alert>
	{:else if loading}
		<div class="text-center py-10 text-xs text-[#78716C]">
			Download dei prompt dal backend in corso…
		</div>
	{:else if promptGroups.length === 0}
		<EmptyState message="Nessun prompt di sistema registrato sul server." />
	{:else}
		<div class="space-y-4">
			{#each promptGroups as group (group.name)}
				{@const selectedPrompt = (group.versions.find(v => v.key === group.selectedVersionKey) ?? group.versions[0]) as SystemPrompt}
				<div class="bg-white border border-[#E7DFD5] rounded-2xl p-4 shadow-xs space-y-4">
					
					<!-- Header del Gruppo -->
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0 flex-1 space-y-1.5">
							<div class="flex items-center gap-2 flex-wrap">
								<h3 class="text-sm font-bold text-[#7A2222] font-mono">{group.name}</h3>
								<Badge variant="purple">selezionata: {selectedPrompt.version}</Badge>
							</div>
							{#if selectedPrompt.description}
								<p class="text-xs text-[#57534E] leading-relaxed">{selectedPrompt.description}</p>
							{/if}
						</div>

						<div class="flex items-center gap-1 shrink-0">
							<Button
								size="sm"
								variant="outline"
								title="Copia prompt negli appunti"
								onclick={() => handleCopy(selectedPrompt.template || '', selectedPrompt.key)}
							>
								{#if copiedId === selectedPrompt.key}
									<Check class="w-3.5 h-3.5 text-emerald-600" />
									<span>Copiato</span>
								{:else}
									<Copy class="w-3.5 h-3.5" />
									<span>Copia</span>
								{/if}
							</Button>
							
							<Button
								size="sm"
								variant="outline"
								title={expandedId === selectedPrompt.key ? 'Nascondi prompt' : 'Mostra prompt'}
								onclick={() => expandedId = expandedId === selectedPrompt.key ? null : selectedPrompt.key}
							>
								{#if expandedId === selectedPrompt.key}
									<ChevronUp class="w-3.5 h-3.5" />
									<span>Nascondi</span>
								{:else}
									<ChevronDown class="w-3.5 h-3.5" />
									<span>Mostra</span>
								{/if}
							</Button>
						</div>
					</div>

					<!-- Selettore Versione & Dettagli Tecnici -->
					<div class="flex flex-col gap-2 pt-2 border-t border-dashed border-[#E7DFD5] sm:flex-row sm:items-center sm:justify-between">
						<!-- Bottoni per scegliere la versione -->
						<div class="flex items-center gap-1.5 flex-wrap">
							<span class="text-[9px] font-bold uppercase tracking-wider text-[#78716C] mr-1">Versioni disponibili:</span>
							{#each group.versions as v (v.key)}
								<button
									onclick={() => group.selectedVersionKey = v.key}
									class="px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer
									{group.selectedVersionKey === v.key 
										? 'bg-[#7A2222] text-white border-[#7A2222]' 
										: 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'}"
								>
									{v.version}
								</button>
							{/each}
						</div>

						<!-- Meta info della versione selezionata -->
						<div class="flex items-center gap-3 text-[10px] font-mono text-[#A8A29E] flex-wrap">
							{#if selectedPrompt.mode}
								<span>modalità: <span class="text-[#57534E] font-semibold">{selectedPrompt.mode}</span></span>
							{/if}
							{#if selectedPrompt.hash}
								<span>hash: {selectedPrompt.hash.slice(0, 8)}</span>
							{/if}
							{#if selectedPrompt.file}
								<span>file: {selectedPrompt.file}</span>
							{/if}
						</div>
					</div>

					<!-- Box del Prompt Espanso -->
					{#if expandedId === selectedPrompt.key}
						<div class="bg-[#FAF6F0] border border-[#E7DFD5] rounded-xl p-3 max-h-96 overflow-y-auto">
							<pre class="font-mono text-[10px] text-[#1C1917] leading-relaxed whitespace-pre-wrap select-all">{selectedPrompt.template}</pre>
						</div>
					{/if}

				</div>
			{/each}
		</div>
	{/if}
</div>
