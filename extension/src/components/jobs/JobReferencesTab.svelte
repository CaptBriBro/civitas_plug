<script lang="ts">
	import {
		Sparkles,
		Link2,
		FileText,
		BookOpen,
		Landmark,
		Scale,
		ShieldAlert,
		History,
		Bot,
		Layers,
		AlertCircle
	} from 'lucide-svelte';
	import Badge from '@/components/ui/Badge.svelte';
	import Button from '@/components/ui/Button.svelte';
	import type { Workset } from '@/domain/workset';
	import { PROVIDER_LABELS } from '@/adapters/ai/selectors';
	import { router } from '@/router.svelte';

	interface Props {
		workset: Workset | null;
	}

	let { workset }: Props = $props();

	let globalCategoryFilter = $state<string>('ALL');
	let expandedArticleTexts = $state<Record<string, boolean>>({});

	let articles = $derived(workset?.articles || []);
	let approvedBatches = $derived((workset?.batches || []).filter((b) => b.status === 'imported'));

	// Raccoglie SOLTANTO le relazioni estratte e approvate dai batch AI
	let rawAllRelations = $derived.by(() => {
		const result: any[] = [];
		let itemIdx = 0;

		for (const b of approvedBatches) {
			const providerName = b.provider
				? PROVIDER_LABELS[b.provider] || b.provider
				: 'Modello AI';

			for (const r of b.relations || []) {
				let family = (r.family || 'REFERENCE').toUpperCase();
				let type = r.relation_type || 'GENERIC';
				if (lblIncludes(r.evidence, 'abrogat') || type === 'ABROGATION') {
					family = 'AMENDMENT';
					type = 'ABROGATION';
				}

				result.push({
					id: `rel-${b.id}-${r.source_article || 'src'}-${r.target_article || 'tgt'}-${itemIdx++}`,
					source_article: r.source_article || 'Disposizione',
					family,
					type,
					source_evidence: r.evidence || `${r.source_article} → ${r.target_article}`,
					target: {
						raw_text: r.target_article || 'Rinvio AI',
						provision: { article: r.target_article || null }
					},
					target_article: r.target_article,
					confidence_score: Math.round((r.confidence || 0.9) * 100),
					identification_label: `Estratto ed approvato con ${providerName}`,
					identification_method: 'AI_MODEL_EXTRACTED',
					provider: providerName,
					batch_id: b.id,
					is_llm: true
				});
			}
		}

		return result;
	});

	function lblIncludes(str: string | undefined, search: string): boolean {
		return !!(str && str.toLowerCase().includes(search));
	}

	// Deduplica relazioni approvate
	let allRelations = $derived.by(() => {
		const res: any[] = [];
		const seen = new Set<string>();
		for (const r of rawAllRelations) {
			const key = `${r.source_article}|${r.family}|${r.target_article}|${(r.source_evidence || '').slice(0, 30)}`;
			if (!seen.has(key)) {
				seen.add(key);
				res.push(r);
			}
		}
		return res;
	});

	// Conteggi per categoria
	let countAll = $derived(allRelations.length);
	let countAbrogations = $derived(
		allRelations.filter(
			(r: any) =>
				r.family === 'AMENDMENT' ||
				r.type === 'ABROGATION' ||
				lblIncludes(r.source_evidence, 'abrogat')
		).length
	);
	let countReferences = $derived(
		allRelations.filter(
			(r: any) =>
				(r.family === 'REFERENCE' || r.type === 'GENERIC') &&
				r.type !== 'ABROGATION'
		).length
	);
	let countPrecedence = $derived(
		allRelations.filter((r: any) => r.family === 'PRECEDENCE' || r.type === 'DEROGATION').length
	);
	let countApplication = $derived(
		allRelations.filter((r: any) => r.family === 'APPLICATION').length
	);

	// Filtra relazioni per categoria
	let filteredAllRelations = $derived.by(() => {
		if (globalCategoryFilter === 'ALL') return allRelations;
		if (globalCategoryFilter === 'ABROGATIONS') {
			return allRelations.filter(
				(r: any) =>
					r.family === 'AMENDMENT' ||
					r.type === 'ABROGATION' ||
					lblIncludes(r.source_evidence, 'abrogat')
			);
		}
		if (globalCategoryFilter === 'REFERENCES') {
			return allRelations.filter(
				(r: any) =>
					(r.family === 'REFERENCE' || r.type === 'GENERIC') &&
					r.type !== 'ABROGATION'
			);
		}
		if (globalCategoryFilter === 'PRECEDENCE') {
			return allRelations.filter((r: any) => r.family === 'PRECEDENCE' || r.type === 'DEROGATION');
		}
		if (globalCategoryFilter === 'APPLICATION') {
			return allRelations.filter((r: any) => r.family === 'APPLICATION');
		}
		return allRelations;
	});

	// Raggruppa per articolo sorgente
	let groupedRelations = $derived.by(() => {
		const groups: Record<string, any[]> = {};
		for (const rel of filteredAllRelations) {
			const artKey = rel.source_article || 'Disposizione';
			if (!groups[artKey]) groups[artKey] = [];
			groups[artKey].push(rel);
		}

		return Object.entries(groups)
			.map(([sourceArticle, relations]) => ({
				sourceArticle,
				relations
			}))
			.sort((a, b) => {
				const numA = parseInt(a.sourceArticle.replace(/[^0-9]/g, '')) || 0;
				const numB = parseInt(b.sourceArticle.replace(/[^0-9]/g, '')) || 0;
				return numA - numB;
			});
	});

	function getArticleText(articleName: string): string {
		const num = articleName.replace(/[^0-9]/g, '');
		const found = articles.find((a) => a.numero === num || `Art. ${a.numero}` === articleName);
		return found?.testo || '';
	}

	function getArticleRubrica(articleName: string): string {
		const num = articleName.replace(/[^0-9]/g, '');
		const found = articles.find((a) => a.numero === num || `Art. ${a.numero}` === articleName);
		return found?.rubrica || '';
	}

	function getFamilyBadgeVariant(family?: string): 'red' | 'amber' | 'green' | 'purple' | 'stone' {
		switch (family?.toUpperCase()) {
			case 'REFERENCE':
				return 'purple';
			case 'APPLICATION':
				return 'purple';
			case 'PRECEDENCE':
				return 'red';
			case 'CONDITION':
				return 'amber';
			case 'AMENDMENT':
				return 'green';
			default:
				return 'stone';
		}
	}
</script>

<div class="space-y-4 py-2">
	{#if approvedBatches.length === 0}
		<div class="p-8 bg-amber-50/80 rounded-2xl border border-amber-300 text-center space-y-3">
			<div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 border border-amber-400 mx-auto">
				<AlertCircle class="w-6 h-6 text-amber-800" />
			</div>
			<div class="max-w-md mx-auto space-y-1">
				<h3 class="font-display text-sm font-bold text-amber-950">Nessuna relazione normativa ancora approvata</h3>
				<p class="text-xs text-amber-900 font-serif leading-relaxed">
					Questa scheda si popolerà automaticamente con i rinvii normativi confermati <strong>solo dopo che avrai analizzato ed approvato i batch AI</strong>.
				</p>
			</div>
		</div>
	{:else}
		<!-- Top Info Box -->
		<div class="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E7DFD5] space-y-2">
			<div class="flex items-center gap-2 text-[#7A2222] font-bold text-xs font-display">
				<Link2 class="w-4 h-4 text-[#7A2222] shrink-0" />
				<span>Relazioni Normative Approvate ({approvedBatches.length} batch riconciliati)</span>
			</div>
			<p class="text-xs text-[#57534E] leading-relaxed font-serif">
				Rappresentazione formale dei rinvii approvati: <strong>REFERENCE</strong> (rinvii), <strong>APPLICATION</strong> (applicazione), <strong>PRECEDENCE</strong> (deroghe/eccezioni), <strong>CONDITION</strong> (condizioni) ed <strong>AMENDMENT</strong> (modifiche).
			</p>
		</div>

		<!-- Category Filter Bar -->
		<div class="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E7DFD5] text-xs font-semibold">
			<button
				onclick={() => (globalCategoryFilter = 'ALL')}
				class="px-3.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer
					{globalCategoryFilter === 'ALL' ? 'bg-[#7A2222] text-white border-[#7A2222] shadow-2xs' : 'bg-white text-[#57534E] border-[#E7DFD5] hover:bg-[#F5EBE6]'}"
			>
				<Scale class="w-3.5 h-3.5" /> TUTTI ({countAll})
			</button>

			<button
				onclick={() => (globalCategoryFilter = 'ABROGATIONS')}
				class="px-3.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer
					{globalCategoryFilter === 'ABROGATIONS' ? 'bg-rose-800 text-white border-rose-800 shadow-2xs' : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'}"
			>
				<ShieldAlert class="w-3.5 h-3.5 text-rose-700" /> Abrogazioni & Modifiche ({countAbrogations})
			</button>

			<button
				onclick={() => (globalCategoryFilter = 'REFERENCES')}
				class="px-3.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer
					{globalCategoryFilter === 'REFERENCES' ? 'bg-sky-800 text-white border-sky-800 shadow-2xs' : 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100'}"
			>
				<FileText class="w-3.5 h-3.5 text-sky-700" /> Rinvii & Citazioni ({countReferences})
			</button>

			<button
				onclick={() => (globalCategoryFilter = 'PRECEDENCE')}
				class="px-3.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer
					{globalCategoryFilter === 'PRECEDENCE' ? 'bg-amber-800 text-white border-amber-800 shadow-2xs' : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'}"
			>
				<Landmark class="w-3.5 h-3.5 text-amber-700" /> Precedenze & Deroghe ({countPrecedence})
			</button>

			<button
				onclick={() => (globalCategoryFilter = 'APPLICATION')}
				class="px-3.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer
					{globalCategoryFilter === 'APPLICATION' ? 'bg-purple-800 text-white border-purple-800 shadow-2xs' : 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'}"
			>
				<BookOpen class="w-3.5 h-3.5 text-purple-700" /> Applicazioni ({countApplication})
			</button>
		</div>

		<!-- Relations List Grouped by Source Article -->
		{#if groupedRelations.length === 0}
			<div class="p-6 bg-[#FAF6F0] rounded-2xl border border-[#E7DFD5] text-center space-y-3">
				<div class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
					<Sparkles class="w-5 h-5 text-amber-800" />
				</div>
				<h4 class="text-xs font-bold text-[#1C1917]">Nessun rinvio normativo approvato per la categoria selezionata</h4>
			</div>
		{:else}
			<div class="space-y-6">
				{#each groupedRelations as group, gIdx (`group_${group.sourceArticle}_${gIdx}`)}
					{@const rubrica = getArticleRubrica(group.sourceArticle)}
					{@const artText = getArticleText(group.sourceArticle)}
					{@const showFullText = expandedArticleTexts[group.sourceArticle] ?? false}

					<div class="p-5 rounded-2xl bg-white border border-[#E7DFD5] shadow-xs space-y-4">
						<div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
							
							<!-- LEFT COLUMN (5 cols): Citation & Article Text Box -->
							<div class="lg:col-span-5 space-y-4">
								<div class="p-3.5 rounded-xl bg-white border border-[#E7DFD5] shadow-2xs space-y-2">
									<div class="flex items-center gap-2.5">
										<span class="px-3 py-1 text-xs font-mono font-bold rounded-lg bg-[#7A2222] text-white shadow-2xs">
											📌 {group.sourceArticle}
										</span>
										<div>
											<span class="text-xs font-bold text-[#1C1917] block">
												{rubrica ? `${group.sourceArticle} - ${rubrica}` : `Disposizione ${group.sourceArticle}`}
											</span>
											<span class="text-[11px] text-[#78716C] font-medium">
												{group.relations.length} {group.relations.length === 1 ? 'Rinvio Approvato' : 'Rinvii Approvati'}
											</span>
										</div>
									</div>
								</div>

								<div class="bg-[#FAF6F0] p-4 rounded-xl border border-[#E7DFD5] shadow-2xs space-y-3">
									<div class="flex items-center justify-between gap-2 border-b border-[#E7DFD5] pb-2">
										<span class="font-bold text-[#7A2222] font-serif text-xs flex items-center gap-1.5">
											<BookOpen class="w-4 h-4 text-[#7A2222]" />
											Testo Disposizione ({group.sourceArticle})
										</span>
									</div>

									{#if artText}
										<div class="space-y-2">
											<div class="font-serif text-[#1C1917] leading-relaxed text-xs select-text bg-white p-3.5 rounded-lg border border-[#E7DFD5] max-h-[350px] overflow-y-auto whitespace-pre-wrap font-sans shadow-2xs">
												{#if showFullText || artText.length <= 250}
													"{artText}"
												{:else}
													"{artText.slice(0, 250)}..."
												{/if}
											</div>
											{#if artText.length > 250}
												<div class="flex justify-end">
													<button
														type="button"
														onclick={() => (expandedArticleTexts[group.sourceArticle] = !showFullText)}
														class="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white border border-[#E7DFD5] text-[#57534E] hover:text-[#7A2222] hover:bg-[#F5EBE6] transition-colors cursor-pointer"
													>
														{showFullText ? '▼ Mostra estratto breve' : '▲ Espandi testo completo'}
													</button>
												</div>
											{/if}
										</div>
									{:else}
										<div class="p-3 bg-white rounded-lg border border-[#E7DFD5] text-xs text-stone-500 italic">
											Testo della disposizione non disponibile.
										</div>
									{/if}
								</div>
							</div>

							<!-- RIGHT COLUMN (7 cols): Cards Rinvii Normativi Approvati -->
							<div class="lg:col-span-7 space-y-4">
								<div class="p-4 rounded-xl bg-white border border-[#E7DFD5] shadow-2xs space-y-3">
									<h4 class="text-xs font-extrabold uppercase tracking-wider text-[#78716C] flex items-center gap-2 pb-2 border-b border-stone-200">
										<History class="w-4 h-4 text-purple-700" />
										Relazioni Approvate
									</h4>

									<div class="space-y-3">
										{#each group.relations as rel, rIdx (`rel_${rel.id}_${rIdx}`)}
											{@const isAbrogationRel = rel.family === 'AMENDMENT' || rel.type === 'ABROGATION'}

											<div class="p-3.5 rounded-xl border space-y-2 text-xs {isAbrogationRel ? 'bg-rose-50/50 border-rose-300' : 'bg-[#FAF6F0] border-[#E7DFD5]'}">
												<div class="flex items-center justify-between gap-2 flex-wrap">
													<div class="flex items-center gap-2 flex-wrap">
														<Badge variant={getFamilyBadgeVariant(rel.family)}>
															{rel.family || 'REFERENCE'} / {rel.type || 'GENERIC'}
														</Badge>

														{#if isAbrogationRel}
															<span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 text-rose-900 border border-rose-300">
																⚡ NORMATIVE EFFECT / ABROGATION
															</span>
														{/if}
													</div>

													<div class="flex items-center gap-1.5 text-[10px] font-mono">
														<span class="px-2.5 py-1 font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-lg flex items-center gap-1">
															✅ Approvato ({rel.provider || 'AI'})
														</span>
													</div>
												</div>

												<!-- Target Information -->
												<div class="flex items-center gap-2 font-bold text-[#1C1917] flex-wrap pt-0.5">
													<span class="text-[#78716C] font-normal">Target Normativo:</span>
													{#if rel.target?.provision?.article}
														<span class="px-2 py-0.5 font-mono text-xs font-bold rounded-md bg-[#7A2222] text-white shadow-2xs">
															🎯 {rel.target.provision.article}
														</span>
														{#if rel.target.raw_text && rel.target.raw_text !== rel.target.provision.article}
															<span class="text-[11px] text-[#78716C] font-normal">({rel.target.raw_text})</span>
														{/if}
													{:else}
														<span class="font-display text-[#7A2222] text-xs font-bold">
															{rel.target?.raw_text || rel.target_article || 'Rinvio Generico'}
														</span>
													{/if}
												</div>

												<!-- Evidence Quote -->
												{#if rel.source_evidence}
													<div class="bg-white rounded-lg p-2.5 border border-[#E7DFD5] text-[11px] text-[#57534E] font-serif italic">
														<span class="not-italic text-[10px] font-bold uppercase tracking-wide text-[#78716C] block mb-0.5">
															Evidenza Testuale Estratta:
														</span>
														"{rel.source_evidence}"
													</div>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>
