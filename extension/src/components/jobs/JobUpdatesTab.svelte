<script lang="ts">
	import {
		History,
		Search,
		Calendar,
		FileText,
		Layers,
		CheckCircle2,
		Sparkles,
		Download,
		Tag,
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight
	} from 'lucide-svelte';
	import type { ActUpdateEntry } from '@/domain/workset';
	import Badge from '@/components/ui/Badge.svelte';
	import Button from '@/components/ui/Button.svelte';

	interface Props {
		updates: ActUpdateEntry[];
		downloading: boolean;
		onstartdownload: () => void;
	}

	let { updates, downloading, onstartdownload }: Props = $props();

	let searchQuery = $state('');
	let selectedTargetArt = $state<string | null>(null);
	let currentPage = $state(1);
	let pageSize = $state(20);

	// Raccogli tutti gli articoli bersaglio citati per filtrare rapidamente
	let allTargetArticles = $derived.by(() => {
		const set = new Set<string>();
		for (const u of updates) {
			for (const art of u.target_articles_detected || []) {
				set.add(art);
			}
		}
		return Array.from(set).sort((a, b) => {
			const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
			const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
			return numA - numB;
		});
	});

	let filteredUpdates = $derived.by(() => {
		let list = updates;
		if (selectedTargetArt) {
			list = list.filter((u) => u.target_articles_detected?.includes(selectedTargetArt!));
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter(
				(u) =>
					(u.atto_modificante && u.atto_modificante.toLowerCase().includes(q)) ||
					(u.testo_disposizione && u.testo_disposizione.toLowerCase().includes(q)) ||
					(u.progr && u.progr.toLowerCase().includes(q)) ||
					(u.data_pubblicazione && u.data_pubblicazione.toLowerCase().includes(q))
			);
		}
		return list;
	});

	let totalPages = $derived(Math.max(1, Math.ceil(filteredUpdates.length / pageSize)));

	let paginatedUpdates = $derived.by(() => {
		const start = (currentPage - 1) * pageSize;
		return filteredUpdates.slice(start, start + pageSize);
	});

	// Reset pagina se cambiano i filtri
	$effect(() => {
		searchQuery;
		selectedTargetArt;
		pageSize;
		currentPage = 1;
	});
</script>

<div class="space-y-4">
	<!-- HEADER E FILTRI -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF6F0] p-4 rounded-2xl border border-[#E7DFD5]">
		<div>
			<h3 class="text-sm font-bold text-[#7A2222] flex items-center gap-2">
				<History class="w-4 h-4 text-[#7A2222]" /> Cronologia Novelle e Modifiche Legislative
			</h3>
			<p class="text-xs text-[#78716C] mt-0.5">
				{updates.length} voci di modifica e abrogazione estratte ufficialmente da Normattiva.
			</p>
		</div>

		{#if updates.length === 0}
			<Button size="sm" onclick={onstartdownload} disabled={downloading}>
				<Download class="w-3.5 h-3.5" />
				{downloading ? 'Acquisizione in corso…' : 'Scarica Aggiornamenti Atto'}
			</Button>
		{/if}
	</div>

	{#if updates.length > 0}
		<!-- BARRA RICERCA E FILTRO ARTICOLI -->
		<div class="flex items-center gap-2 flex-wrap">
			<div class="relative flex-1 min-w-[200px]">
				<Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cerca nella cronistoria (legge, testo, data, progressivo)…"
					class="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E7DFD5] rounded-xl focus:outline-none focus:border-[#7A2222]"
				/>
			</div>

			{#if allTargetArticles.length > 0}
				<div class="flex items-center gap-1.5 text-xs">
					<span class="text-[#78716C] font-medium text-[11px]">Filtra per articolo:</span>
					<select
						bind:value={selectedTargetArt}
						class="text-xs bg-white border border-[#E7DFD5] rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#7A2222]"
					>
						<option value={null}>Tutti gli articoli ({allTargetArticles.length})</option>
						{#each allTargetArticles as art}
							<option value={art}>{art}</option>
						{/each}
					</select>
				</div>
			{/if}
		</div>

		<!-- BARRA DI PAGINAZIONE SUPERIORE -->
		{#if filteredUpdates.length > 0}
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF6F0] p-3 rounded-2xl border border-[#E7DFD5] text-xs text-[#57534E]">
				<div class="flex items-center gap-2 flex-wrap">
					<span>Mostra</span>
					<select
						bind:value={pageSize}
						class="bg-white border border-[#E7DFD5] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#7A2222]"
					>
						<option value={10}>10 per pagina</option>
						<option value={20}>20 per pagina</option>
						<option value={50}>50 per pagina</option>
						<option value={100}>100 per pagina</option>
					</select>
					<span class="text-[#78716C] text-[11px]">
						({(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredUpdates.length)} di {filteredUpdates.length} novelle)
					</span>
				</div>

				<div class="flex items-center gap-1">
					<button
						type="button"
						onclick={() => (currentPage = 1)}
						disabled={currentPage <= 1}
						class="p-1.5 rounded-lg border border-[#E7DFD5] bg-white text-[#57534E] hover:bg-[#F5EBE6] disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
						title="Prima pagina"
					>
						<ChevronsLeft class="w-3.5 h-3.5" />
					</button>
					<button
						type="button"
						onclick={() => (currentPage = Math.max(1, currentPage - 1))}
						disabled={currentPage <= 1}
						class="p-1.5 rounded-lg border border-[#E7DFD5] bg-white text-[#57534E] hover:bg-[#F5EBE6] disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
						title="Pagina precedente"
					>
						<ChevronLeft class="w-3.5 h-3.5" />
					</button>

					<span class="px-2.5 py-1 font-bold text-stone-800 bg-white border border-[#E7DFD5] rounded-lg font-mono text-[11px]">
						{currentPage} / {totalPages}
					</span>

					<button
						type="button"
						onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
						disabled={currentPage >= totalPages}
						class="p-1.5 rounded-lg border border-[#E7DFD5] bg-white text-[#57534E] hover:bg-[#F5EBE6] disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
						title="Pagina successiva"
					>
						<ChevronRight class="w-3.5 h-3.5" />
					</button>
					<button
						type="button"
						onclick={() => (currentPage = totalPages)}
						disabled={currentPage >= totalPages}
						class="p-1.5 rounded-lg border border-[#E7DFD5] bg-white text-[#57534E] hover:bg-[#F5EBE6] disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
						title="Ultima pagina"
					>
						<ChevronsRight class="w-3.5 h-3.5" />
					</button>
				</div>
			</div>
		{/if}

		<!-- LISTA ORDINATA E PAGINATA DELLE MODIFICHE -->
		<div class="space-y-3 max-h-[600px] overflow-y-auto pr-1">
			{#if filteredUpdates.length === 0}
				<div class="p-8 text-center bg-white rounded-2xl border border-[#E7DFD5] text-xs text-[#78716C]">
					Nessuna voce di aggiornamento corrisponde alla ricerca.
				</div>
			{:else}
				{#each paginatedUpdates as update, index (index)}
					<div class="bg-white rounded-2xl border border-[#E7DFD5] p-4 shadow-2xs hover:border-[#7A2222]/40 transition-colors space-y-2.5 text-left">
						<!-- INTESTAZIONE VOCE -->
						<div class="flex items-start justify-between gap-3 flex-wrap">
							<div class="flex items-center gap-2 flex-wrap">
								<Badge variant="stone">
									Progr. {update.progr || (currentPage - 1) * pageSize + index + 1}
								</Badge>
								{#if update.data_pubblicazione}
									<span class="text-[11px] text-[#78716C] flex items-center gap-1">
										<Calendar class="w-3 h-3 text-[#A8A29E]" />
										G.U. {update.data_pubblicazione}
									</span>
								{/if}
							</div>

							{#if update.target_articles_detected && update.target_articles_detected.length > 0}
								<div class="flex items-center gap-1.5 flex-wrap">
									<span class="text-[10px] uppercase font-bold text-indigo-700">Bersagli:</span>
									{#each update.target_articles_detected as targetArt, artIdx (artIdx)}
										<span class="px-2 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-md">
											{targetArt}
										</span>
									{/each}
								</div>
							{/if}
						</div>

						<!-- ATTO MODIFICANTE -->
						{#if update.atto_modificante}
							<div class="text-xs font-bold text-[#7A2222] bg-[#FAF6F0] p-2 rounded-lg border border-[#E7DFD5]/60 flex items-center gap-1.5">
								<FileText class="w-3.5 h-3.5 text-[#7A2222]" />
								{update.atto_modificante}
							</div>
						{/if}

						<!-- TESTO DELLA DISPOSIZIONE / NOVELLA -->
						<div class="text-xs text-[#292524] font-serif leading-relaxed bg-[#FAF6F0]/40 p-3 rounded-xl border border-stone-100 whitespace-pre-wrap">
							{update.testo_disposizione}
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- BARRA DI PAGINAZIONE -->
		{#if filteredUpdates.length > 0}
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF6F0] p-3.5 rounded-2xl border border-[#E7DFD5] text-xs text-[#57534E]">
				<div class="flex items-center gap-2">
					<span>Mostra</span>
					<select
						bind:value={pageSize}
						class="bg-white border border-[#E7DFD5] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#7A2222]"
					>
						<option value={10}>10 per pagina</option>
						<option value={20}>20 per pagina</option>
						<option value={50}>50 per pagina</option>
						<option value={100}>100 per pagina</option>
					</select>
					<span class="text-[#78716C]">
						({(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredUpdates.length)} di {filteredUpdates.length} novelle)
					</span>
				</div>

				<div class="flex items-center gap-1">
					<button
						type="button"
						onclick={() => (currentPage = 1)}
						disabled={currentPage <= 1}
						class="p-1.5 rounded-lg border border-[#E7DFD5] bg-white text-[#57534E] hover:bg-[#F5EBE6] disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
						title="Prima pagina"
					>
						<ChevronsLeft class="w-4 h-4" />
					</button>
					<button
						type="button"
						onclick={() => (currentPage = Math.max(1, currentPage - 1))}
						disabled={currentPage <= 1}
						class="p-1.5 rounded-lg border border-[#E7DFD5] bg-white text-[#57534E] hover:bg-[#F5EBE6] disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
						title="Pagina precedente"
					>
						<ChevronLeft class="w-4 h-4" />
					</button>

					<span class="px-3 py-1 font-bold text-stone-800 bg-white border border-[#E7DFD5] rounded-lg font-mono">
						{currentPage} / {totalPages}
					</span>

					<button
						type="button"
						onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
						disabled={currentPage >= totalPages}
						class="p-1.5 rounded-lg border border-[#E7DFD5] bg-white text-[#57534E] hover:bg-[#F5EBE6] disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
						title="Pagina successiva"
					>
						<ChevronRight class="w-4 h-4" />
					</button>
					<button
						type="button"
						onclick={() => (currentPage = totalPages)}
						disabled={currentPage >= totalPages}
						class="p-1.5 rounded-lg border border-[#E7DFD5] bg-white text-[#57534E] hover:bg-[#F5EBE6] disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
						title="Ultima pagina"
					>
						<ChevronsRight class="w-4 h-4" />
					</button>
				</div>
			</div>
		{/if}
	{:else}
		<div class="p-12 text-center bg-white rounded-2xl border border-dashed border-[#E7DFD5] space-y-3">
			<History class="w-10 h-10 text-[#A8A29E] mx-auto opacity-50" />
			<div class="space-y-1">
				<h4 class="text-sm font-bold text-[#1C1917]">Nessun aggiornamento ancora acquisito</h4>
				<p class="text-xs text-[#78716C] max-w-md mx-auto">
					Avvia lo scaricamento per consultare l'elenco ordinato di tutte le novelle, abrogazioni e modifiche ufficiali pubblicate per questo atto.
				</p>
			</div>
			<Button size="sm" onclick={onstartdownload} disabled={downloading}>
				<Download class="w-3.5 h-3.5" />
				{downloading ? 'Acquisizione in corso…' : 'Scarica Aggiornamenti Atto'}
			</Button>
		</div>
	{/if}
</div>
