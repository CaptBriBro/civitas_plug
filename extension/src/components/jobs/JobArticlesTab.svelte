<script lang="ts">
	import { Search, ChevronLeft, ChevronRight, BookOpen } from 'lucide-svelte';
	import type { LegalArticle } from '@/domain/article';

	interface Props {
		articles: LegalArticle[];
		downloading: boolean;
		onstartdownload?: () => void;
	}

	let { articles, downloading, onstartdownload }: Props = $props();

	let searchQuery = $state('');
	let currentPage = $state(1);
	const pageSize = 15;

	let filteredArticles = $derived(
		articles.filter((a) => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				a.numero.toLowerCase().includes(q) ||
				(a.rubrica && a.rubrica.toLowerCase().includes(q)) ||
				a.testo.toLowerCase().includes(q)
			);
		})
	);

	let totalPages = $derived(Math.ceil(filteredArticles.length / pageSize) || 1);

	let paginatedArticles = $derived(
		filteredArticles.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	function formatText(text: string): string[] {
		return text.split('\n').filter((l) => l.trim().length > 0);
	}
</script>

<div class="space-y-4 py-2">
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
		<h4 class="text-xs font-bold text-[#7A2222] font-display flex items-center gap-1.5">
			<BookOpen class="w-3.5 h-3.5" /> Contenuto Scaricato & Articoli Strutturati
		</h4>
		{#if articles.length > 0}
			<span class="text-xs font-mono font-bold text-[#7A2222] bg-[#FAF6F0] px-2.5 py-1 rounded-xl border border-[#E7DFD5]">
				{articles.length} articoli estratti complessivi
			</span>
		{/if}
	</div>

	{#if downloading}
		<div class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium flex items-center justify-between animate-pulse shadow-2xs">
			<span class="flex items-center gap-2">
				<span class="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
				⏳ Scaricamento in corso... ({articles.length} articoli estratti finora)
			</span>
		</div>
	{/if}

	{#if articles.length > 0}
		<div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FAF6F0] p-3 rounded-xl border border-[#E7DFD5]">
			<div class="relative w-full sm:w-72">
				<Search class="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
				<input
					type="text"
					placeholder="Filtra articolo (es. Art. 143, famiglia)..."
					bind:value={searchQuery}
					oninput={() => (currentPage = 1)}
					class="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-lg border border-[#E7DFD5] focus:outline-none focus:border-[#7A2222]"
				/>
			</div>

			<div class="flex items-center gap-2 text-xs text-[#57534E]">
				<span>Pagina {currentPage} di {totalPages}</span>
				<div class="flex items-center gap-1">
					<button
						onclick={() => (currentPage = Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
						class="p-1 rounded-lg border border-[#E7DFD5] hover:bg-white disabled:opacity-40 cursor-pointer"
					>
						<ChevronLeft class="w-3.5 h-3.5" />
					</button>
					<button
						onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
						disabled={currentPage === totalPages}
						class="p-1 rounded-lg border border-[#E7DFD5] hover:bg-white disabled:opacity-40 cursor-pointer"
					>
						<ChevronRight class="w-3.5 h-3.5" />
					</button>
				</div>
			</div>
		</div>

		<div class="space-y-3">
			{#each paginatedArticles as art, index (`art_${art.numero}_${art.ordering || index}_${index}`)}
				<div class="p-4 rounded-xl bg-[#FAF6F0] border border-[#E7DFD5] hover:border-[#7A2222]/40 transition-all space-y-2.5">
					<div class="flex items-center justify-between flex-wrap gap-2">
						<div class="flex items-center gap-2 flex-wrap">
							<span class="font-mono text-xs font-bold text-[#7A2222]">Art. {art.numero}</span>
							<span class="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-200 text-emerald-900 rounded-md uppercase tracking-wide">
								Vigente
							</span>

							{#if art.candidateScore >= 0.85}
								<span class="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-300 rounded-md flex items-center gap-1">
									🔥 PROBABILITÀ RINVII ({Math.round(art.candidateScore * 100)}%)
								</span>
							{:else if art.candidateScore >= 0.50}
								<span class="px-1.5 py-0.5 text-[10px] font-bold bg-sky-100 text-sky-950 border border-sky-300 rounded-md flex items-center gap-1">
									⚡ RINVII CANDIDATI ({Math.round(art.candidateScore * 100)}%)
								</span>
							{/if}

							{#if art.versions && art.versions.filter((v) => !v.isCurrent).length > 0}
								<span class="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-800 rounded-md">
									{art.versions.filter((v) => !v.isCurrent).length} versioni storiche
								</span>
							{/if}
						</div>
						{#if art.rubrica}
							<span class="text-[11px] font-serif font-semibold text-[#1C1917]">{art.rubrica}</span>
						{/if}
					</div>

					<div class="text-xs text-[#57534E] leading-relaxed font-serif space-y-1.5 whitespace-pre-wrap">
						{#each formatText(art.testo) as pLine, pIdx (`${art.numero}_p_${pIdx}`)}
							<p class="leading-relaxed">{pLine}</p>
						{/each}
					</div>

					{#if art.candidates && art.candidates.length > 0}
						<div class="mt-2.5 p-3 rounded-xl bg-amber-50/90 border border-amber-300 space-y-2">
							<div class="flex items-center justify-between">
								<span class="text-xs font-bold text-amber-950 flex items-center gap-1.5 font-display">
									⚡ Rinvii & Citazioni Rilevati nel Testo:
								</span>
								<span class="text-[10px] font-mono font-bold bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full border border-amber-300">
									Confidenza: {Math.round(art.candidateScore * 100)}%
								</span>
							</div>
							<div class="space-y-1.5">
								{#each art.candidates as cand, cIdx (`${art.numero}_c_${cand.id || cIdx}_${cIdx}`)}
									<div class="flex items-start gap-1.5 text-xs text-amber-900 bg-white/80 p-2 rounded-lg border border-amber-200/80 font-serif">
										<span class="shrink-0 text-amber-700 font-bold">🔗</span>
										<span class="italic font-medium">"{cand.text}"</span>
										<span class="ml-auto text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">{cand.label}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if art.versions && art.versions.filter((v) => !v.isCurrent).length > 0}
						<details class="mt-2">
							<summary class="text-[11px] text-indigo-700 font-semibold cursor-pointer hover:underline">
								📜 Mostra {art.versions.filter((v) => !v.isCurrent).length} versioni storiche
							</summary>
							<div class="mt-2 space-y-3 pl-3 border-l-2 border-indigo-200">
								{#each art.versions.filter((v) => !v.isCurrent) as ver, vIdx (`${art.numero}_v_${ver.versionLabel || vIdx}_${vIdx}`)}
									<div class="bg-white/60 rounded-lg p-3 border border-[#E7DFD5]/60">
										<div class="flex items-center justify-between mb-1.5">
											<span class="font-semibold text-[11px] text-emerald-700">
												{ver.versionLabel}
											</span>
											<span class="text-[10px] text-[#78716C]">
												{ver.vigenzaStart || ''}{ver.vigenzaEnd ? ` → ${ver.vigenzaEnd}` : ' → oggi'}
											</span>
										</div>
										<p class="text-xs text-[#57534E] font-serif whitespace-pre-wrap">{ver.testo}</p>
									</div>
								{/each}
							</div>
						</details>
					{/if}
				</div>
			{/each}
		</div>
	{:else if !downloading}
		<div class="p-6 text-center bg-[#FAF6F0] rounded-xl border border-[#E7DFD5] text-xs text-[#78716C] italic space-y-3">
			<p>Nessun contenuto scaricato ancora. Avvia l'acquisizione per estrarre e strutturare gli articoli da Normattiva.</p>
			{#if onstartdownload}
				<button
					onclick={onstartdownload}
					class="px-4 py-2 bg-[#7A2222] text-white text-xs font-bold rounded-xl hover:bg-[#631B1B] shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
				>
					Scarica articoli ora
				</button>
			{/if}
		</div>
	{/if}
</div>
