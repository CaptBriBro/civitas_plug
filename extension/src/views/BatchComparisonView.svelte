<script lang="ts">
	import {
		ArrowLeft,
		Layers,
		CheckCircle2,
		ShieldAlert,
		Sparkles,
		BookOpen,
		ClipboardPaste,
		Scale,
		Bot,
		FileText,
		ChevronDown,
		ChevronUp,
		Check,
		X,
		RotateCcw,
		Search,
		CheckCheck
	} from 'lucide-svelte';
	import ArticleText from '@/components/article/ArticleText.svelte';
	import Alert from '@/components/ui/Alert.svelte';
	import Button from '@/components/ui/Button.svelte';
	import Badge from '@/components/ui/Badge.svelte';
	import Spinner from '@/components/ui/Spinner.svelte';
	import { worksetStore } from '@/stores/workset.svelte';
	import { jobsStore } from '@/stores/jobs.svelte';
	import { activityStore } from '@/stores/activity.svelte';
	import { router } from '@/router.svelte';
	import { parseAiResponse } from '@/features/results/responseParser';
	import { articlesForBatch } from '@/features/results/batching';
	import type { ExtractedRelation } from '@/domain/workset';
	import type { ProviderId } from '@/domain/prompt';

	interface Props {
		jobId: string;
		batchId: string;
	}

	let { jobId, batchId }: Props = $props();

	let saving = $state(false);
	let saveWarning = $state<string | undefined>(undefined);
	let saveSuccess = $state<string | undefined>(undefined);
	let expandedArticles = $state<Record<string, boolean>>({});
	let expandedCandidates = $state<Record<string, boolean>>({});

	// Tracciamento decisioni utente: 'approved' | 'rejected' | 'pending'
	let relationDecisions = $state<Record<string, 'approved' | 'rejected' | 'pending'>>({});

	let batch = $derived(worksetStore.workset?.batches.find((b) => b.id === batchId));
	let articles = $derived(
		worksetStore.workset && batch ? articlesForBatch(worksetStore.workset, batch) : []
	);

	$effect(() => {
		if (worksetStore.workset?.jobId !== jobId) void worksetStore.load(jobId);
	});

	function toggleArticleText(artNum: string) {
		expandedArticles[artNum] = !expandedArticles[artNum];
	}

	function toggleInitialCandidates(artNum: string) {
		expandedCandidates[artNum] = !expandedCandidates[artNum];
	}

	let reportChatGPT = $derived.by(() => {
		const raw = batch?.rawResponseChatGPT || (batch?.provider === 'chatgpt' ? batch?.rawResponse : null);
		if (!raw || raw.trim().length < 20) return null;
		return parseAiResponse(raw);
	});

	let reportGemini = $derived.by(() => {
		const raw = batch?.rawResponseGemini || (batch?.provider === 'gemini' ? batch?.rawResponse : null);
		if (!raw || raw.trim().length < 20) return null;
		return parseAiResponse(raw);
	});

	let currentCandidates = $derived.by(() => {
		const ws = worksetStore.workset;
		if (!ws || !batch) return [];
		const batchNums = new Set(batch.articleNumbers);
		const candidates: Array<{ articleNum: string; text: string; label: string; id?: string }> = [];

		for (const art of ws.articles) {
			if (batchNums.has(art.numero)) {
				for (const c of art.candidates || []) {
					candidates.push({
						articleNum: art.numero,
						text: c.text,
						label: c.label || 'Candidato Testuale',
						id: c.id
					});
				}
			}
		}
		return candidates;
	});

	let consensusAnalysis = $derived.by(() => {
		const chatGptRels = reportChatGPT?.relations || [];
		const geminiRels = reportGemini?.relations || [];

		const agreed: ExtractedRelation[] = [];
		const onlyChatGPT: ExtractedRelation[] = [];
		const onlyGemini: ExtractedRelation[] = [];

		for (const cRel of chatGptRels) {
			const cTarget = (cRel.target_article || '').replace(/[^0-9]/g, '');
			const inGemini = geminiRels.some((gRel) => {
				const gTarget = (gRel.target_article || '').replace(/[^0-9]/g, '');
				return (cTarget && gTarget && cTarget === gTarget) || cRel.target_article === gRel.target_article;
			});
			if (inGemini) agreed.push(cRel);
			else onlyChatGPT.push(cRel);
		}

		for (const gRel of geminiRels) {
			const gTarget = (gRel.target_article || '').replace(/[^0-9]/g, '');
			const inChatGPT = chatGptRels.some((cRel) => {
				const cTarget = (cRel.target_article || '').replace(/[^0-9]/g, '');
				return (cTarget && gTarget && cTarget === gTarget) || cRel.target_article === gRel.target_article;
			});
			if (!inChatGPT) onlyGemini.push(gRel);
		}

		return { agreed, onlyChatGPT, onlyGemini };
	});

	let articleComparisonGrouped = $derived.by(() => {
		if (!batch) return [];
		const chatGptRels = reportChatGPT?.relations || [];
		const geminiRels = reportGemini?.relations || [];

		return batch.articleNumbers.map((artNum) => {
			const numClean = artNum.replace(/[^0-9]/g, '');

			const matchingArt = articles.find(
				(a) => a.numero === artNum || a.numero.replace(/[^0-9]/g, '') === numClean
			);
			const articleText = matchingArt?.testo || `Testo dell'articolo ${artNum} in caricamento dall'attività.`;
			const rubrica = matchingArt?.rubrica || '';

			const cForArt = chatGptRels.filter((r) => {
				const rNum = (r.source_article || '').replace(/[^0-9]/g, '');
				return rNum === numClean || r.source_article === artNum || r.source_article === `Art. ${artNum}`;
			});

			const gForArt = geminiRels.filter((r) => {
				const rNum = (r.source_article || '').replace(/[^0-9]/g, '');
				return rNum === numClean || r.source_article === artNum || r.source_article === `Art. ${artNum}`;
			});

			const agreed: ExtractedRelation[] = [];
			const onlyChatGPT: ExtractedRelation[] = [];
			const onlyGemini: ExtractedRelation[] = [];

			for (const cRel of cForArt) {
				const cTgt = (cRel.target_article || '').replace(/[^0-9]/g, '');
				const matched = gForArt.find((gRel) => {
					const gTgt = (gRel.target_article || '').replace(/[^0-9]/g, '');
					return (cTgt && gTgt && cTgt === gTgt) || cRel.target_article === gRel.target_article;
				});
				if (matched) agreed.push(cRel);
				else onlyChatGPT.push(cRel);
			}

			for (const gRel of gForArt) {
				const gTgt = (gRel.target_article || '').replace(/[^0-9]/g, '');
				const matched = cForArt.find((cRel) => {
					const cTgt = (cRel.target_article || '').replace(/[^0-9]/g, '');
					return (cTgt && gTgt && cTgt === gTgt) || cRel.target_article === gRel.target_article;
				});
				if (!matched) onlyGemini.push(gRel);
			}

			const artCandidates = currentCandidates.filter((c) => c.articleNum === artNum);
			const missingCandidates = artCandidates.filter((c) => {
				const cNum = c.text.replace(/[^0-9]/g, '');
				const inC = cForArt.some((r) => (r.target_article || '').replace(/[^0-9]/g, '') === cNum);
				const inG = gForArt.some((r) => (r.target_article || '').replace(/[^0-9]/g, '') === cNum);
				return !inC && !inG;
			});

			return {
				articleNum: artNum,
				articleText,
				rubrica,
				artCandidates,
				cForArt,
				gForArt,
				agreed,
				onlyChatGPT,
				onlyGemini,
				missingCandidates
			};
		});
	});

	function getRelKey(rel: ExtractedRelation, prefix: string): string {
		return `${prefix}_${rel.source_article || ''}_${rel.target_article || ''}_${rel.family || ''}`;
	}

	function getDecision(relKey: string): 'approved' | 'rejected' | 'pending' {
		return relationDecisions[relKey] || 'pending';
	}

	function toggleDecision(relKey: string, status: 'approved' | 'rejected') {
		if (relationDecisions[relKey] === status) {
			relationDecisions[relKey] = 'pending';
		} else {
			relationDecisions[relKey] = status;
		}
	}

	function approveAllAgreed() {
		if (!consensusAnalysis) return;
		for (const artGroup of articleComparisonGrouped) {
			for (const rel of artGroup.agreed) {
				relationDecisions[getRelKey(rel, `agreed_${artGroup.articleNum}`)] = 'approved';
			}
		}
	}

	function approveAll() {
		for (const artGroup of articleComparisonGrouped) {
			for (const rel of artGroup.agreed) {
				relationDecisions[getRelKey(rel, `agreed_${artGroup.articleNum}`)] = 'approved';
			}
			for (const rel of artGroup.onlyChatGPT) {
				relationDecisions[getRelKey(rel, `chatgpt_${artGroup.articleNum}`)] = 'approved';
			}
			for (const rel of artGroup.onlyGemini) {
				relationDecisions[getRelKey(rel, `gemini_${artGroup.articleNum}`)] = 'approved';
			}
		}
	}

	function resetDecisions() {
		relationDecisions = {};
	}

	let approvedCount = $derived.by(() => {
		return Object.values(relationDecisions).filter((v) => v === 'approved').length;
	});

	let rejectedCount = $derived.by(() => {
		return Object.values(relationDecisions).filter((v) => v === 'rejected').length;
	});

	async function saveReconciledProposal() {
		saving = true;
		saveWarning = undefined;
		saveSuccess = undefined;
		try {
			const approvedRels: ExtractedRelation[] = [];

			for (const artGroup of articleComparisonGrouped) {
				for (const rel of artGroup.agreed) {
					const k = getRelKey(rel, `agreed_${artGroup.articleNum}`);
					const status = getDecision(k);
					if (status === 'approved' || status === 'pending') {
						approvedRels.push(rel);
					}
				}
				for (const rel of artGroup.onlyChatGPT) {
					const k = getRelKey(rel, `chatgpt_${artGroup.articleNum}`);
					const status = getDecision(k);
					if (status === 'approved') {
						approvedRels.push(rel);
					}
				}
				for (const rel of artGroup.onlyGemini) {
					const k = getRelKey(rel, `gemini_${artGroup.articleNum}`);
					const status = getDecision(k);
					if (status === 'approved') {
						approvedRels.push(rel);
					}
				}
			}

			const jsonText = JSON.stringify({ relations: approvedRels }, null, 2);
			saveWarning = await worksetStore.importResponse(batchId, jsonText, 'chatgpt');
			await jobsStore.loadDetail(jobId);
			void activityStore.refresh();
			saveSuccess = `Batch ${batchId} salvato con successo! La scheda dell'attività Civitas "${worksetStore.workset?.jobTitle || ''}" è stata aggiornata con ${approvedRels.length} relazioni approvate.`;
		} finally {
			saving = false;
		}
	}

	async function saveProviderResult(provider: ProviderId, rawText: string) {
		saving = true;
		saveWarning = undefined;
		saveSuccess = undefined;
		try {
			saveWarning = await worksetStore.importResponse(batchId, rawText, provider);
			await jobsStore.loadDetail(jobId);
			void activityStore.refresh();
			saveSuccess = `Batch ${batchId} salvato ed aggiornata la scheda dell'attività Civitas!`;
		} finally {
			saving = false;
		}
	}

	function getFamilyVariant(family?: string): 'purple' | 'green' | 'amber' | 'red' | 'stone' {
		switch (family?.toUpperCase()) {
			case 'REFERENCE':
				return 'purple';
			case 'APPLICATION':
				return 'purple';
			case 'AMENDMENT':
				return 'green';
			case 'PRECEDENCE':
				return 'amber';
			default:
				return 'stone';
		}
	}
</script>

<div class="space-y-6 animate-in fade-in pb-10">
	<!-- HEADER PAGINA ATTIVITÀ CIVITAS -->
	<div class="flex items-center justify-between flex-wrap gap-4 border-b border-[#E7DFD5] pb-4">
		<div>
			<button
				onclick={() => router.toJob(jobId)}
				class="inline-flex items-center gap-2 text-xs font-semibold text-[#78716C] hover:text-[#7A2222] transition-colors cursor-pointer mb-2"
			>
				<ArrowLeft class="w-4 h-4" /> Torna all'Attività Civitas
			</button>
			<h1 class="font-display text-2xl font-bold text-[#7A2222] flex items-center gap-2">
				<Layers class="w-7 h-7 text-[#7A2222]" />
				Attività Civitas: Report & Riconciliazione Multi-Modello (Batch {batchId})
			</h1>
			<p class="text-xs text-[#78716C] mt-1">
				{worksetStore.workset?.jobTitle || ''} ({articles.length} articoli compresi: artt. {batch?.articleNumbers.join(', ') || ''})
			</p>
		</div>

		<div class="flex gap-2">
			<Button variant="outline" size="sm" onclick={() => router.toJob(jobId)}>
				<CheckCheck class="w-3.5 h-3.5 text-emerald-700" /> Vai alla Scheda dell'Attività Civitas
			</Button>
			<Button variant="outline" size="sm" onclick={() => router.toBatch(jobId, batchId)}>
				<ArrowLeft class="w-3.5 h-3.5" /> Torna al Batch {batchId}
			</Button>
		</div>
	</div>

	{#if saveSuccess}
		<Alert tone="success" message={saveSuccess} />
	{/if}

	{#if worksetStore.loading}
		<div class="flex items-center gap-2 text-xs text-[#78716C] py-20 justify-center">
			<Spinner /> Caricamento dell'attività Civitas in corso…
		</div>
	{:else if !batch}
		<Alert tone="error" message="Batch non trovato nell'attività Civitas." />
	{:else}
		<!-- METRICHE DI SINTESI COMPLESSIVA & AZIONI RAPIDE DI APPROVAZIONE -->
		<div class="p-5 rounded-2xl border bg-white border-[#E7DFD5] space-y-4 shadow-xs">
			<div class="flex items-center justify-between border-b border-purple-100 pb-3 flex-wrap gap-2">
				<span class="text-sm font-bold text-purple-950 flex items-center gap-2 font-display">
					<Scale class="w-5 h-5 text-purple-800" /> Sintesi del Consenso & Riconciliazione (ChatGPT vs Gemini)
				</span>
				<div class="flex items-center gap-2">
					<Badge variant="purple">Multi-Modello</Badge>
					{#if approvedCount > 0}
						<Badge variant="green">✅ {approvedCount} Approvate</Badge>
					{/if}
					{#if rejectedCount > 0}
						<Badge variant="red">❌ {rejectedCount} Rifiutate</Badge>
					{/if}
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-xs font-bold">
				<div class="p-4 bg-emerald-50 text-emerald-950 rounded-xl border border-emerald-300 shadow-2xs">
					<span class="block text-2xl font-extrabold text-emerald-800">{consensusAnalysis?.agreed.length || 0}</span>
					<span class="text-xs uppercase tracking-wide">In Comune (Concordanti)</span>
				</div>
				<div class="p-4 bg-purple-50 text-purple-950 rounded-xl border border-purple-300 shadow-2xs">
					<span class="block text-2xl font-extrabold text-purple-800">{consensusAnalysis?.onlyChatGPT.length || 0}</span>
					<span class="text-xs uppercase tracking-wide">Esclusive ChatGPT</span>
				</div>
				<div class="p-4 bg-blue-50 text-blue-950 rounded-xl border border-blue-300 shadow-2xs">
					<span class="block text-2xl font-extrabold text-blue-800">{consensusAnalysis?.onlyGemini.length || 0}</span>
					<span class="text-xs uppercase tracking-wide">Esclusive Gemini</span>
				</div>
			</div>

			<!-- BARRA AZIONI RAPIDE DI VALUTAZIONE E APPROVAZIONE -->
			<div class="pt-3 border-t border-[#E7DFD5] space-y-3">
				<div class="flex items-center justify-between flex-wrap gap-2">
					<h4 class="text-xs font-bold uppercase tracking-wider text-purple-950">
						Azioni Rapide di Valutazione:
					</h4>
					<div class="flex gap-2 flex-wrap text-xs">
						<button
							type="button"
							onclick={approveAllAgreed}
							class="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold hover:bg-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
						>
							<Check class="w-3.5 h-3.5 text-emerald-700" /> Approva Tutte le Concordanti
						</button>
						<button
							type="button"
							onclick={approveAll}
							class="px-3 py-1 rounded-lg bg-purple-100 text-purple-900 border border-purple-300 font-bold hover:bg-purple-200 transition-colors cursor-pointer flex items-center gap-1"
						>
							<Check class="w-3.5 h-3.5 text-purple-700" /> Approva Tutte le Relazioni
						</button>
						<button
							type="button"
							onclick={resetDecisions}
							class="px-3 py-1 rounded-lg bg-stone-100 text-stone-700 border border-stone-300 font-medium hover:bg-stone-200 transition-colors cursor-pointer flex items-center gap-1"
						>
							<RotateCcw class="w-3.5 h-3.5 text-stone-600" /> Resetta decisioni
						</button>
					</div>
				</div>

				<div class="pt-2 flex gap-3 flex-wrap items-center justify-between bg-purple-50/70 p-3.5 rounded-xl border border-purple-200">
					<div>
						<span class="text-xs font-bold text-purple-950">Salva il Batch & Aggiorna la Scheda dell'Attività Civitas</span>
						<p class="text-[11px] text-purple-900/80">
							Applica le relazioni concordate/approvate al Batch {batchId} ed aggiorna immediatamente la scheda dell'Attività Civitas.
						</p>
					</div>
					<Button variant="ai" onclick={saveReconciledProposal} disabled={saving}>
						<ClipboardPaste class="w-4 h-4" /> 💾 Salva Batch & Aggiorna Scheda Task ({approvedCount > 0 ? `${approvedCount} Approvate` : 'Tutte le Concordanti'})
					</Button>
				</div>
			</div>
		</div>

		<!-- DETTAGLIO RICONCILIAZIONE ARTICOLO PER ARTICOLO -->
		<div class="space-y-4 pt-2">
			<h2 class="text-sm font-extrabold uppercase tracking-wider text-[#78716C] flex items-center gap-2 pb-2 border-b border-[#E7DFD5]">
				<BookOpen class="w-5 h-5 text-[#7A2222]" />
				Analisi Comparativa Dettagliata Articolo per Articolo
			</h2>

			<div class="space-y-4">
				{#each articleComparisonGrouped as artGroup (artGroup.articleNum)}
					<div class="p-5 bg-white rounded-2xl border border-[#E7DFD5] space-y-4 text-xs shadow-xs">
						<div class="flex items-center justify-between border-b border-stone-200 pb-3 flex-wrap gap-2">
							<div class="flex items-center gap-2">
								<span class="px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-[#7A2222] text-white">
									📌 Articolo {artGroup.articleNum}
								</span>
							</div>
							<div class="flex gap-2 text-xs font-mono flex-wrap">
								<span class="px-3 py-1 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">
									✓ {artGroup.agreed.length} concordanti
								</span>
								{#if artGroup.onlyChatGPT.length > 0}
									<span class="px-3 py-1 rounded-md bg-purple-100 text-purple-900 border border-purple-300 font-bold">
										🤖 {artGroup.onlyChatGPT.length} solo ChatGPT
									</span>
								{/if}
								{#if artGroup.onlyGemini.length > 0}
									<span class="px-3 py-1 rounded-md bg-blue-100 text-blue-900 border border-blue-300 font-bold">
										🤖 {artGroup.onlyGemini.length} solo Gemini
									</span>
								{/if}
							</div>
						</div>

						<!-- ANTEPRIMA & TESTO INTEGRALE DELL'ARTICOLO CON TOGGLE -->
						{#if artGroup.articleText}
							<div class="p-3.5 bg-[#FAF6F0] rounded-xl border border-[#E7DFD5] space-y-2">
								<div class="flex items-center justify-between">
									<span class="text-[11px] font-bold text-[#78716C] uppercase tracking-wider flex items-center gap-1 font-mono">
										<FileText class="w-3.5 h-3.5 text-[#7A2222]" /> Testo dell'Articolo {artGroup.articleNum} {#if artGroup.rubrica}<span class="font-normal font-sans italic text-stone-600">— {artGroup.rubrica}</span>{/if}
									</span>
								</div>
								<p class="text-xs text-[#1C1917] leading-relaxed font-serif whitespace-pre-wrap">
									{expandedArticles[artGroup.articleNum] || artGroup.articleText.length <= 220
										? artGroup.articleText
										: `${artGroup.articleText.slice(0, 220)}…`}
								</p>
								{#if artGroup.articleText.length > 220}
									<button
										type="button"
										onclick={() => toggleArticleText(artGroup.articleNum)}
										class="text-[11px] font-bold text-[#7A2222] hover:underline cursor-pointer flex items-center gap-1 mt-1"
									>
										{#if expandedArticles[artGroup.articleNum]}
											<ChevronUp class="w-3.5 h-3.5" /> Nascondi testo
										{:else}
											<ChevronDown class="w-3.5 h-3.5" /> Mostra tutto il testo dell'articolo ({artGroup.articleText.length} caratteri)
										{/if}
									</button>
								{/if}
							</div>
						{/if}

						<!-- RELAZIONI E CANDIDATI EURISTICI INIZIALI RILEVATI PRIMA DELL'AI -->
						{#if artGroup.artCandidates.length > 0}
							<div class="p-3.5 bg-purple-50/50 border border-purple-200 rounded-xl space-y-2">
								<button
									type="button"
									onclick={() => toggleInitialCandidates(artGroup.articleNum)}
									class="w-full flex items-center justify-between text-[#7A2222] font-bold text-xs cursor-pointer hover:underline"
								>
									<span class="flex items-center gap-1.5">
										<Search class="w-4 h-4 text-purple-700" />
										🔍 Riferimenti & Candidati Iniziali Rilevati nel Testo ({artGroup.artCandidates.length} candidati euristici)
									</span>
									{#if expandedCandidates[artGroup.articleNum]}
										<ChevronUp class="w-4 h-4" />
									{:else}
										<ChevronDown class="w-4 h-4" />
									{/if}
								</button>

								{#if expandedCandidates[artGroup.articleNum]}
									<div class="space-y-2 pt-2 border-t border-purple-200 animate-in fade-in">
										{#each artGroup.artCandidates as candidate, cIdx (`initial_${artGroup.articleNum}_${cIdx}`)}
											<div class="p-2.5 bg-white rounded-lg border border-purple-200 text-xs flex items-center justify-between gap-2">
												<div class="min-w-0">
													<span class="font-bold text-purple-950 block font-mono">
														"{candidate.text}"
													</span>
													<span class="text-[10px] text-stone-500">{candidate.label}</span>
												</div>
												<Badge variant="purple">Candidato Iniziale</Badge>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/if}

						<!-- RELAZIONI CONCORDANTI CON TASTI APPROVA / RIFIUTA -->
						{#if artGroup.agreed.length > 0}
							<div class="space-y-2">
								<span class="text-xs font-bold text-emerald-900 block flex items-center gap-1.5">
									<CheckCircle2 class="w-4 h-4 text-emerald-600" /> Relazioni Confermate da Entrambi i Modelli:
								</span>
								{#each artGroup.agreed as rel, aIdx (`agreed_${artGroup.articleNum}_${aIdx}`)}
									{@const relKey = getRelKey(rel, `agreed_${artGroup.articleNum}`)}
									{@const decision = getDecision(relKey)}
									<div class="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-2">
										<div class="flex items-center justify-between flex-wrap gap-2">
											<div class="flex items-center gap-2">
												<span class="font-bold text-emerald-950 font-mono text-sm">
													🎯 Target: {rel.target_article || 'Rinvio'}
												</span>
												<Badge variant={getFamilyVariant(rel.family)}>
													{rel.family || 'REFERENCE'} / {rel.relation_type || 'GENERIC'}
												</Badge>
											</div>

											<!-- AZIONI APPROVA E RIFIUTA -->
											<div class="flex items-center gap-1.5">
												{#if decision === 'approved'}
													<Badge variant="green">✅ Approvato</Badge>
												{:else if decision === 'rejected'}
													<Badge variant="red">❌ Rifiutato</Badge>
												{:else}
													<Badge variant="amber">⏳ Da valutare</Badge>
												{/if}

												<button
													type="button"
													onclick={() => toggleDecision(relKey, 'approved')}
													class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1
														{decision === 'approved' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100'}"
												>
													<Check class="w-3.5 h-3.5" /> Approva
												</button>

												<button
													type="button"
													onclick={() => toggleDecision(relKey, 'rejected')}
													class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1
														{decision === 'rejected' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-white text-rose-800 border border-rose-300 hover:bg-rose-100'}"
												>
													<X class="w-3.5 h-3.5" /> Rifiuta
												</button>
											</div>
										</div>
										{#if rel.evidence}
											<p class="text-xs text-emerald-950 italic font-serif bg-white p-2.5 rounded-lg border border-emerald-200">
												"{rel.evidence}"
											</p>
										{/if}
									</div>
								{/each}
							</div>
						{/if}

						<!-- RELAZIONI ESCLUSIVE CHATGPT CON TASTI APPROVA / RIFIUTA -->
						{#if artGroup.onlyChatGPT.length > 0}
							<div class="space-y-2">
								<span class="text-xs font-bold text-purple-900 block flex items-center gap-1.5">
									<Bot class="w-4 h-4 text-purple-700" /> Relazioni Trovate SOLO da ChatGPT:
								</span>
								{#each artGroup.onlyChatGPT as rel, cIdx (`cOnly_${artGroup.articleNum}_${cIdx}`)}
									{@const relKey = getRelKey(rel, `chatgpt_${artGroup.articleNum}`)}
									{@const decision = getDecision(relKey)}
									<div class="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-xs space-y-2">
										<div class="flex items-center justify-between flex-wrap gap-2">
											<div class="flex items-center gap-2">
												<span class="font-bold text-purple-950 font-mono text-sm">
													🎯 Target: {rel.target_article || 'Rinvio'}
												</span>
												<Badge variant={getFamilyVariant(rel.family)}>
													{rel.family || 'REFERENCE'}
												</Badge>
											</div>

											<!-- AZIONI APPROVA E RIFIUTA -->
											<div class="flex items-center gap-1.5">
												{#if decision === 'approved'}
													<Badge variant="green">✅ Approvato</Badge>
												{:else if decision === 'rejected'}
													<Badge variant="red">❌ Rifiutato</Badge>
												{:else}
													<Badge variant="amber">⏳ Da valutare</Badge>
												{/if}

												<button
													type="button"
													onclick={() => toggleDecision(relKey, 'approved')}
													class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1
														{decision === 'approved' ? 'bg-purple-700 text-white shadow-2xs' : 'bg-white text-purple-800 border border-purple-300 hover:bg-purple-100'}"
												>
													<Check class="w-3.5 h-3.5" /> Approva
												</button>

												<button
													type="button"
													onclick={() => toggleDecision(relKey, 'rejected')}
													class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1
														{decision === 'rejected' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-white text-rose-800 border border-rose-300 hover:bg-rose-100'}"
												>
													<X class="w-3.5 h-3.5" /> Rifiuta
												</button>
											</div>
										</div>
										{#if rel.evidence}
											<p class="text-xs text-purple-950 italic font-serif bg-white p-2.5 rounded-lg border border-purple-200">
												"{rel.evidence}"
											</p>
										{/if}
									</div>
								{/each}
							</div>
						{/if}

						<!-- RELAZIONI ESCLUSIVE GEMINI CON TASTI APPROVA / RIFIUTA -->
						{#if artGroup.onlyGemini.length > 0}
							<div class="space-y-2">
								<span class="text-xs font-bold text-blue-900 block flex items-center gap-1.5">
									<Bot class="w-4 h-4 text-blue-700" /> Relazioni Trovate SOLO da Gemini:
								</span>
								{#each artGroup.onlyGemini as rel, gIdx (`gOnly_${artGroup.articleNum}_${gIdx}`)}
									{@const relKey = getRelKey(rel, `gemini_${artGroup.articleNum}`)}
									{@const decision = getDecision(relKey)}
									<div class="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-2">
										<div class="flex items-center justify-between flex-wrap gap-2">
											<div class="flex items-center gap-2">
												<span class="font-bold text-blue-950 font-mono text-sm">
													🎯 Target: {rel.target_article || 'Rinvio'}
												</span>
												<Badge variant={getFamilyVariant(rel.family)}>
													{rel.family || 'REFERENCE'}
												</Badge>
											</div>

											<!-- AZIONI APPROVA E RIFIUTA -->
											<div class="flex items-center gap-1.5">
												{#if decision === 'approved'}
													<Badge variant="green">✅ Approvato</Badge>
												{:else if decision === 'rejected'}
													<Badge variant="red">❌ Rifiutato</Badge>
												{:else}
													<Badge variant="amber">⏳ Da valutare</Badge>
												{/if}

												<button
													type="button"
													onclick={() => toggleDecision(relKey, 'approved')}
													class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1
														{decision === 'approved' ? 'bg-blue-700 text-white shadow-2xs' : 'bg-white text-blue-800 border border-blue-300 hover:bg-blue-100'}"
												>
													<Check class="w-3.5 h-3.5" /> Approva
												</button>

												<button
													type="button"
													onclick={() => toggleDecision(relKey, 'rejected')}
													class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1
														{decision === 'rejected' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-white text-rose-800 border border-rose-300 hover:bg-rose-100'}"
												>
													<X class="w-3.5 h-3.5" /> Rifiuta
												</button>
											</div>
										</div>
										{#if rel.evidence}
											<p class="text-xs text-blue-950 italic font-serif bg-white p-2.5 rounded-lg border border-blue-200">
												"{rel.evidence}"
											</p>
										{/if}
									</div>
								{/each}
							</div>
						{/if}

						<!-- CANDIDATI SPARITI / ESCLUSI DA ENTRAMBI -->
						{#if artGroup.missingCandidates.length > 0}
							<div class="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1">
								<span class="text-xs font-bold text-amber-950 flex items-center gap-1.5">
									<ShieldAlert class="w-4 h-4 text-amber-700" /> Candidati testuali esclusi da entrambi i modelli:
								</span>
								<p class="text-xs text-amber-900 font-serif italic">
									{artGroup.missingCandidates.map((c) => `"${c.text}"`).join(' · ')}
								</p>
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- CARD DI SALVATAGGIO IN FONDO ALLA PAGINA -->
			<div class="pt-4">
				<div class="flex gap-3 flex-wrap items-center justify-between bg-purple-50/70 p-4 rounded-2xl border border-purple-200 shadow-xs">
					<div>
						<span class="text-sm font-bold text-purple-950 flex items-center gap-2">
							<ClipboardPaste class="w-4 h-4 text-purple-800" /> Salva il Batch & Aggiorna la Scheda dell'Attività Civitas
						</span>
						<p class="text-xs text-purple-900/80 mt-0.5">
							Applica le relazioni concordate/approvate al Batch {batchId} ed aggiorna immediatamente la scheda dell'Attività Civitas.
						</p>
					</div>
					<Button variant="ai" size="lg" onclick={saveReconciledProposal} disabled={saving}>
						<ClipboardPaste class="w-4 h-4" /> 💾 Salva Batch & Aggiorna Scheda Task ({approvedCount > 0 ? `${approvedCount} Approvate` : 'Tutte le Concordanti'})
					</Button>
				</div>
			</div>
		</div>

		{#if saveWarning}
			<Alert tone="warning" message={saveWarning} />
		{/if}
	{/if}
</div>
