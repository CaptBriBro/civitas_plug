<script lang="ts">
	import {
		Link2,
		AlertCircle,
		AlertTriangle,
		ShieldAlert,
		FileText,
		ChevronRight,
		LayoutGrid,
		List,
		Sparkles,
		CheckCircle2,
		ExternalLink,
		HelpCircle
	} from 'lucide-svelte';
	import Badge from '@/components/ui/Badge.svelte';
	import Button from '@/components/ui/Button.svelte';
	import type { Workset } from '@/domain/workset';

	interface Props {
		workset: Workset | null;
	}

	let { workset }: Props = $props();

	let filterCategory = $state<'all' | 'repeal' | 'broken' | 'partial_broken' | 'active'>('all');
	let viewMode = $state<'grid' | 'detailed'>('grid');
	let expandedArtMap = $state<Record<string, boolean>>({});

	let articles = $derived(workset?.articles || []);
	let approvedBatches = $derived((workset?.batches || []).filter((b) => b.status === 'imported'));

	// All candidate references and approved relations
	let allCandidates = $derived.by(() => {
		const result: Array<{
			id: string;
			sourceArticle: string;
			text: string;
			label: string;
			type: string;
			parsed?: any;
		}> = [];
		for (const art of articles) {
			for (const c of art.candidates || []) {
				result.push({
					id: `${art.numero}_${c.id || c.text}`,
					sourceArticle: art.numero,
					text: c.text,
					label: c.label || 'Citazione Esterna',
					type: c.type || 'generic_normative_reference',
					parsed: c.parsed
				});
			}
		}
		return result;
	});

	let approvedRelations = $derived(approvedBatches.flatMap((b) => b.relations || []));

	// Consolidate linked laws list with status analysis (broken, partial broken, repeal, active)
	let linkedLawsList = $derived.by(() => {
		const map = new Map<
			string,
			{
				id: string;
				title: string;
				targetArticle: string;
				citationsCount: number;
				isRepeal: boolean;
				isBroken: boolean;
				isPartialBroken: boolean;
				statusLabel: string;
				badgeVariant: 'purple' | 'green' | 'amber' | 'stone' | 'red';
				targetArticles: string[];
				evidenceList: Array<{ sourceArt: string; text: string }>;
			}
		>();

		// Helper to extract law key
		function getLawKey(title: string) {
			return title.trim().toLowerCase().replace(/\s+/g, ' ');
		}

		// 1. Process heuristic candidates
		for (const c of allCandidates) {
			if (c.type === 'law_reference' || c.type === 'decree_reference' || c.type === 'code_reference') {
				const title = c.parsed?.lawNumber
					? `${c.parsed.lawType || 'Legge'} n. ${c.parsed.lawNumber}`
					: c.text.slice(0, 60);

				const key = getLawKey(title);
				const isRepeal = Boolean(c.text.toLowerCase().includes('abrogat') || c.label.toLowerCase().includes('abrogaz'));
				const isBroken = Boolean(c.text.toLowerCase().includes('abrogat') || !articles.some(a => c.text.includes(a.numero)));
				const isPartial = Boolean(isBroken && isRepeal);

				const existing = map.get(key);
				if (existing) {
					existing.citationsCount++;
					if (!existing.evidenceList.some((e) => e.text === c.text)) {
						existing.evidenceList.push({ sourceArt: c.sourceArticle, text: c.text });
					}
				} else {
					map.set(key, {
						id: key,
						title,
						targetArticle: c.text,
						citationsCount: 1,
						isRepeal,
						isBroken,
						isPartialBroken: isPartial,
						statusLabel: isRepeal
							? '⚡ ATTO ABROGANTE'
							: isPartial
							? '⚠️ PARTIAL BROKEN LINK'
							: isBroken
							? '🚫 BROKEN LINK (COLLEGAMENTO SPEZZATO)'
							: '✅ NORMA CONNESSA VIGENTE',
						badgeVariant: isRepeal ? 'purple' : isBroken ? 'amber' : 'green',
						targetArticles: [c.text],
						evidenceList: [{ sourceArt: c.sourceArticle, text: c.text }]
					});
				}
			}
		}

		// 2. Process approved relations
		for (const r of approvedRelations) {
			const target = r.target_article || '';
			if (!target) continue;

			const key = getLawKey(target);
			const isRepeal = Boolean(
				r.relation_type === 'ABROGATION' ||
				r.relation_type === 'REPEAL' ||
				r.family === 'AMENDMENT' ||
				(r.evidence && r.evidence.toLowerCase().includes('abrogat'))
			);
			
			const isBroken = Boolean(isRepeal || !articles.some(a => target.includes(a.numero)));
			const isPartial = Boolean(isBroken && isRepeal);

			const existing = map.get(key);
			if (existing) {
				existing.citationsCount++;
				if (isRepeal) existing.isRepeal = true;
				if (r.evidence && !existing.evidenceList.some((e) => e.text === r.evidence)) {
					existing.evidenceList.push({ sourceArt: r.source_article || 'Articolo', text: r.evidence });
				}
			} else {
				map.set(key, {
					id: key,
					title: target,
					targetArticle: target,
					citationsCount: 1,
					isRepeal,
					isBroken,
					isPartialBroken: isPartial,
					statusLabel: isRepeal
						? '⚡ ATTO ABROGANTE'
						: isPartial
						? '⚠️ PARTIAL BROKEN LINK'
						: isBroken
						? '🚫 BROKEN LINK (COLLEGAMENTO SPEZZATO)'
						: '✅ NORMA CONNESSA VIGENTE',
					badgeVariant: isRepeal ? 'purple' : isBroken ? 'amber' : 'green',
					targetArticles: [target],
					evidenceList: [{ sourceArt: r.source_article || 'Articolo', text: r.evidence || target }]
				});
			}
		}

		return Array.from(map.values());
	});

	// Filter metrics
	let repealingCount = $derived(linkedLawsList.filter((l) => l.isRepeal).length);
	let brokenCount = $derived(linkedLawsList.filter((l) => l.isBroken && !l.isRepeal).length);
	let partialBrokenCount = $derived(linkedLawsList.filter((l) => l.isPartialBroken).length);
	let activeCount = $derived(linkedLawsList.filter((l) => !l.isBroken && !l.isRepeal).length);

	let filteredLaws = $derived.by(() => {
		switch (filterCategory) {
			case 'repeal':
				return linkedLawsList.filter((l) => l.isRepeal);
			case 'broken':
				return linkedLawsList.filter((l) => l.isBroken && !l.isRepeal);
			case 'partial_broken':
				return linkedLawsList.filter((l) => l.isPartialBroken);
			case 'active':
				return linkedLawsList.filter((l) => !l.isBroken && !l.isRepeal);
			default:
				return linkedLawsList;
		}
	});

	function getOfficialTextForTarget(target: string): string {
		const matchedArt = articles.find(
			(a) => target.includes(a.numero) || a.testo.includes(target)
		);
		return matchedArt?.testo || `Testo o citazione legale di "${target}" estratta dall'analisi dei documenti.`;
	}
</script>

<div class="space-y-4 py-2">
	<!-- AUDIT ALERT PER BROKEN LINKS / ABROGAZIONI MISMATCH -->
	{#if brokenCount > 0 || repealingCount > 0}
		<div class="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1.5 shadow-2xs">
			<div class="flex items-start gap-2 font-bold text-xs text-amber-900">
				<AlertTriangle class="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
				<span>Audit Connessioni Normative: Rilevati Broken Links e Clausole Abrogative</span>
			</div>
			<p class="text-[11px] text-amber-800 leading-relaxed font-serif pl-6">
				L'estrazione ha individuato <strong>{brokenCount} rinvii a fonti non presenti in memoria (Broken Links)</strong> e <strong>{repealingCount} atti abroganti</strong>. Utilizza i filtri sottostanti per esaminare in dettaglio ogni disposizione.
			</p>
		</div>
	{/if}

	<!-- INTESTAZIONE E SELETTORE FILTRI CATEGORIA COMPLETO -->
	<div class="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E7DFD5] space-y-3">
		<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
			<div>
				<div class="flex items-center gap-2 text-[#7A2222] font-bold text-xs font-display">
					<ShieldAlert class="w-4 h-4 text-[#7A2222] shrink-0" />
					<span>Fonti Esterne & Leggi Connesse ({linkedLawsList.length})</span>
				</div>
				<p class="text-xs text-[#57534E] leading-relaxed font-serif mt-1">
					Quadro analitico completo di tutte le fonti esterne, abrogazioni, deroghe e rinvii normativi connessi.
				</p>
			</div>

			<!-- CONTROLLO SWITCHER VISTA: GRIGLIA COMPATTA O LISTA DETTAGLIATA -->
			<div class="flex items-center gap-2 shrink-0">
				<div class="inline-flex p-1 bg-white rounded-xl border border-[#E7DFD5] shadow-2xs">
					<button
						onclick={() => (viewMode = 'grid')}
						title="Visualizza Griglia Compatta"
						class="p-1.5 rounded-lg transition-all cursor-pointer {viewMode === 'grid' ? 'bg-[#7A2222] text-white shadow-2xs' : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF6F0]'}"
					>
						<LayoutGrid class="w-4 h-4" />
					</button>
					<button
						onclick={() => (viewMode = 'detailed')}
						title="Visualizza Lista Dettagliata"
						class="p-1.5 rounded-lg transition-all cursor-pointer {viewMode === 'detailed' ? 'bg-[#7A2222] text-white shadow-2xs' : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF6F0]'}"
					>
						<List class="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>

		<!-- PULSANTI FILTRO SU BROKEN LINKS, REPEAL ED ATTIVI -->
		<div class="flex items-center gap-2 flex-wrap pt-2 border-t border-[#E7DFD5] text-xs">
			<button
				type="button"
				onclick={() => (filterCategory = 'all')}
				class="px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border {filterCategory === 'all' ? 'bg-[#7A2222] text-white border-[#7A2222] shadow-2xs' : 'bg-white text-stone-700 border-[#E7DFD5] hover:bg-[#FAF6F0]'}"
			>
				Tutti ({linkedLawsList.length})
			</button>

			<button
				type="button"
				onclick={() => (filterCategory = 'repeal')}
				class="px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border {filterCategory === 'repeal' ? 'bg-purple-900 text-white border-purple-900 shadow-2xs' : 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'}"
			>
				⚡ Atti Abroganti ({repealingCount})
			</button>

			<button
				type="button"
				onclick={() => (filterCategory = 'broken')}
				class="px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border {filterCategory === 'broken' ? 'bg-amber-900 text-white border-amber-900 shadow-2xs' : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'}"
			>
				🚫 Broken Links ({brokenCount})
			</button>

			<button
				type="button"
				onclick={() => (filterCategory = 'partial_broken')}
				class="px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border {filterCategory === 'partial_broken' ? 'bg-rose-900 text-white border-rose-900 shadow-2xs' : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'}"
			>
				⚠️ Partial Broken Links ({partialBrokenCount})
			</button>

			<button
				type="button"
				onclick={() => (filterCategory = 'active')}
				class="px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border {filterCategory === 'active' ? 'bg-emerald-900 text-white border-emerald-900 shadow-2xs' : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'}"
			>
				✅ Norme Vigenti ({activeCount})
			</button>
		</div>
	</div>

	<!-- ELENCO DELLE LEGGI CONNESSE (VISTA GRIGLIA O DETTAGLIATA) -->
	{#if filteredLaws.length === 0}
		<div class="p-8 text-center text-xs text-[#78716C] bg-[#FAF6F0] rounded-2xl border border-[#E7DFD5] italic">
			Nessuna fonte esterna o legge connessa corrispondente al filtro selezionato.
		</div>
	{:else}
		<div class="space-y-4">
			{#each filteredLaws as law (law.id)}
				<div class="p-5 rounded-2xl bg-white border border-[#E7DFD5] shadow-xs space-y-4">
					
					<!-- Header Scheda Legge -->
					<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E7DFD5]">
						<div class="space-y-1">
							<div class="flex items-center gap-2 flex-wrap">
								<span class="text-base font-bold text-[#7A2222] font-display">{law.title}</span>
								
								<span class="px-2.5 py-0.5 text-[10px] font-bold rounded-md {law.isRepeal ? 'bg-purple-100 text-purple-900 border border-purple-300' : law.isBroken ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-950 border border-emerald-300'}">
									{law.statusLabel}
								</span>
							</div>
							<p class="text-xs text-[#78716C] font-serif italic">
								{law.citationsCount} rinvii o citazioni rilevate nel testo acquisito
							</p>
						</div>
					</div>

					<!-- VISTA GRIGLIA COMPATTA -->
					{#if viewMode === 'grid'}
						<div class="bg-[#FAF6F0] rounded-xl p-4 border border-[#E7DFD5] space-y-3 animate-in fade-in">
							<p class="text-xs font-bold text-[#1C1917]">
								Disposizioni e citazioni correlate ({law.evidenceList.length}):
							</p>

							<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
								{#each law.evidenceList as item, idx (`${law.id}_item_${idx}`)}
									{@const expKey = `${law.id}_${idx}`}
									{@const isExpanded = expandedArtMap[expKey]}

									<div class="{isExpanded ? 'col-span-1 sm:col-span-2 md:col-span-3' : ''} space-y-2 transition-all">
										<button
											type="button"
											class="w-full bg-white border border-[#E7DFD5] rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 shadow-2xs hover:border-[#7A2222] transition-colors cursor-pointer group text-left {isExpanded ? 'border-[#7A2222] bg-[#FAF6F0]' : ''}"
											onclick={() => (expandedArtMap[expKey] = !expandedArtMap[expKey])}
										>
											<div class="flex items-center gap-1.5 text-[#7A2222] font-mono font-bold truncate">
												<FileText class="w-3.5 h-3.5 text-[#7A2222] shrink-0" />
												<span class="truncate">📌 {item.sourceArt}</span>
											</div>
											<ChevronRight class="w-3.5 h-3.5 text-[#78716C] group-hover:text-[#7A2222] transition-transform shrink-0 {isExpanded ? 'rotate-90 text-[#7A2222]' : ''}" />
										</button>

										{#if isExpanded}
											<div class="p-4 bg-amber-50/80 rounded-2xl border border-amber-300 space-y-3 text-xs animate-in fade-in shadow-md">
												<div class="flex items-center justify-between font-bold text-amber-950 flex-wrap gap-2 pb-2 border-b border-amber-200">
													<span class="flex items-center gap-2 font-display text-amber-900 text-sm">
														📜 Citazione Estratta da <strong>{item.sourceArt}</strong>
													</span>
													<Badge variant="amber">{law.statusLabel}</Badge>
												</div>

												<div class="p-3 bg-white rounded-xl border border-amber-200 text-stone-900 space-y-1 shadow-2xs">
													<strong class="font-sans block text-[10px] uppercase text-amber-900 font-bold tracking-wider mb-1">
														Testo / Prova Estratta:
													</strong>
													<p class="text-xs text-[#1C1917] font-serif leading-relaxed italic bg-[#FAF6F0] p-2.5 rounded-lg border border-[#E7DFD5]">
														"{item.text}"
													</p>
												</div>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- VISTA DETTAGLIATA -->
					{#if viewMode === 'detailed'}
						<div class="space-y-2.5 animate-in fade-in">
							<p class="text-xs font-bold text-[#1C1917] mb-1">
								Elenco Dettagliato Citazioni ed Evidenze Testuali ({law.evidenceList.length}):
							</p>

							{#each law.evidenceList as item, idx (`${law.id}_det_${idx}`)}
								{@const expKeyDet = `${law.id}_det_${idx}`}
								{@const isDetExpanded = expandedArtMap[expKeyDet]}

								<div class="space-y-2">
									<div class="bg-[#FAF6F0] rounded-xl p-3.5 border border-[#E7DFD5] flex items-center justify-between gap-3 text-xs shadow-2xs hover:border-[#7A2222] transition-all">
										<div class="flex items-center gap-3 min-w-0">
											<div class="p-2 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 shrink-0">
												<FileText class="w-4 h-4 text-amber-700" />
											</div>
											<div class="min-w-0">
												<div class="flex items-center gap-2">
													<span class="font-bold text-[#1C1917] font-mono text-xs">Da {item.sourceArt}</span>
												</div>
												<p class="text-[11px] text-[#57534E] font-serif mt-0.5 truncate">
													"{item.text}"
												</p>
											</div>
										</div>

										<button
											type="button"
											onclick={() => (expandedArtMap[expKeyDet] = !expandedArtMap[expKeyDet])}
											class="px-3 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs shrink-0 active:scale-95"
										>
											{isDetExpanded ? 'Nascondi' : 'Dettaglio'} <ChevronRight class="w-3.5 h-3.5 transition-transform {isDetExpanded ? 'rotate-90' : ''}" />
										</button>
									</div>

									{#if isDetExpanded}
										<div class="p-3.5 bg-amber-50/90 rounded-xl border border-amber-300 space-y-2 text-xs animate-in fade-in shadow-2xs ml-4">
											<strong class="font-sans block text-[10px] uppercase text-amber-900 font-bold tracking-wide">📜 Evidenza Testuale Completa:</strong>
											<p class="text-xs text-[#1C1917] font-serif italic bg-white p-2.5 rounded-lg border border-amber-200 leading-relaxed">
												"{item.text}"
											</p>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}

				</div>
			{/each}
		</div>
	{/if}
</div>
