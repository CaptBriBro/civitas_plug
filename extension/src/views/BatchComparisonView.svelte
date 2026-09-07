<script lang="ts">
	import {
		ArrowLeft,
		Layers,
		ClipboardPaste,
		Scale,
		BookOpen,
		Check,
		RotateCcw,
		CheckCheck,
		Filter,
		ChevronUp,
		ChevronDown
	} from 'lucide-svelte';
	import Alert from '@/components/ui/Alert.svelte';
	import Button from '@/components/ui/Button.svelte';
	import Badge from '@/components/ui/Badge.svelte';
	import Spinner from '@/components/ui/Spinner.svelte';
	import { listWorksets, updateBatch } from '@/services/storage/worksetStore';
	import { worksetStore } from '@/stores/workset.svelte';
	import { activityStore } from '@/stores/activity.svelte';
	import { router } from '@/router.svelte';
	import { parseAiResponse } from '@/features/results/responseParser';
	import { articlesForBatch, actUpdatesForBatch } from '@/features/results/batching';
	import type { ExtractedRelation } from '@/domain/workset';
	import type { ProviderId } from '@/domain/prompt';
	import { getRelKey } from '@/utils/relationUtils';
	import ArticleComparisonGroup from '@/components/results/ArticleComparisonGroup.svelte';
	import RelationEditModal, { type EditableRelationDraft } from '@/components/results/RelationEditModal.svelte';
	import ConfirmModal from '@/components/ui/ConfirmModal.svelte';

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

	let allLocalWorksets = $state<Array<{ jobId: string; jobTitle: string }>>([]);

	onMount(async () => {
		try {
			const wsList = await listWorksets();
			allLocalWorksets = wsList.map((w) => ({
				jobId: w.jobId,
				jobTitle: w.jobTitle || w.jobId
			}));
		} catch {
			// ignore
		}
	});

	$effect(() => {
		void worksetStore.load(jobId);
		const onFocus = () => {
			if (document.visibilityState === 'visible') {
				void worksetStore.load(jobId);
			}
		};
		window.addEventListener('focus', onFocus);
		document.addEventListener('visibilitychange', onFocus);
		return () => {
			window.removeEventListener('focus', onFocus);
			document.removeEventListener('visibilitychange', onFocus);
		};
	});

	// Tracciamento decisioni utente: 'approved' | 'rejected' | 'pending'
	let relationDecisions = $state<Record<string, 'approved' | 'rejected' | 'pending'>>({});

	// Campi temporanei piatti per la modale di editing
	let editedRelations = $state<Record<string, ExtractedRelation>>({});
	let editingKey = $state<string | null>(null);
	let editingOriginalRel = $state<ExtractedRelation | null>(null);
	let editingDraft = $state<EditableRelationDraft | null>(null);
	let editingArticleTitle = $state<string>('');
	let editingArticleText = $state<string>('');

	function startEdit(relKey: string, originalRel: ExtractedRelation, articleTitle: string, articleText: string) {
		editingKey = relKey;
		editingOriginalRel = originalRel;
		editingArticleTitle = articleTitle;
		editingArticleText = articleText;
		const currentVal = editedRelations[relKey] || originalRel;
		const rawArticle = String(currentVal.source_act?.article || '');
		const commaMatch = rawArticle.match(/,?\s*comma\s+(\S+)/i);
		const articleOnly = commaMatch ? rawArticle.replace(commaMatch[0], '').trim() : rawArticle;
		const commaOnly = commaMatch ? commaMatch[1] : '';

		let srcType = String(currentVal.source_act?.type || '');
		let srcNum = String(currentVal.source_act?.number || '');
		let srcYear = String(currentVal.source_act?.year || '');

		const jobTitle = worksetStore.workset?.jobTitle || articleTitle || '';
		if (!srcType && !srcNum && jobTitle) {
			const yearM = jobTitle.match(/\b(19\d\d|20\d\d)\b/);
			const numM = jobTitle.match(/n\.\s*(\d+)/i) || jobTitle.match(/\bno?\.\s*(\d+)/i) || jobTitle.match(/\b(\d+)\b/);
			if (numM) srcNum = numM[1];
			if (yearM) srcYear = yearM[1];

			if (/regio\s*decreto/i.test(jobTitle)) srcType = 'REGIO_DECRETO_LEGGE';
			else if (/decreto\s*legislativo/i.test(jobTitle) || /d\.lgs/i.test(jobTitle)) srcType = 'DECRETO_LEGISLATIVO';
			else if (/decreto\s*legge/i.test(jobTitle) || /d\.l\./i.test(jobTitle)) srcType = 'DECRETO_LEGGE';
			else if (/legge/i.test(jobTitle)) srcType = 'LEGGE';
			else if (/codice/i.test(jobTitle)) srcType = 'CODICE_CIVILE';
		}

		editingDraft = {
			source_article: currentVal.source_article,
			target_article: currentVal.target_article,
			target_paragraph: currentVal.target_paragraph,
			family: currentVal.family,
			relation_type: currentVal.relation_type,
			evidence: currentVal.evidence,
			confidence: currentVal.confidence,
			source_act: currentVal.source_act,
			source_act_type: srcType,
			source_act_number: srcNum,
			source_act_year: srcYear,
			source_act_article: articleOnly,
			source_act_comma: commaOnly,
			extra: currentVal.extra ? JSON.parse(JSON.stringify(currentVal.extra)) : undefined
		};
	}

	function saveEdit() {
		if (editingKey && editingDraft && editingOriginalRel) {
			const articleParts = [
				editingDraft.source_act_article || '',
				editingDraft.source_act_comma ? `comma ${editingDraft.source_act_comma}` : ''
			].filter(Boolean);
			const builtArticle = articleParts.join(', ') || undefined;

			if (editingDraft.source_act_type || editingDraft.source_act_number || editingDraft.source_act_year || builtArticle) {
				editingDraft.source_act = {
					type: editingDraft.source_act_type || undefined,
					number: editingDraft.source_act_number || undefined,
					year: editingDraft.source_act_year || undefined,
					article: builtArticle
				};
			} else {
				editingDraft.source_act = undefined;
			}

			delete editingDraft.source_act_type;
			delete editingDraft.source_act_number;
			delete editingDraft.source_act_year;
			delete editingDraft.source_act_article;
			delete editingDraft.source_act_comma;

			editedRelations[editingKey] = { ...editingDraft };
		}
		cancelEdit();
	}

	function cancelEdit() {
		editingKey = null;
		editingOriginalRel = null;
		editingDraft = null;
		editingArticleTitle = '';
		editingArticleText = '';
	}

	function toggleArticleText(key: string) {
		expandedArticles[key] = !expandedArticles[key];
	}

	function toggleInitialCandidates(key: string) {
		expandedCandidates[key] = !expandedCandidates[key];
	}

	let batch = $derived(worksetStore.workset?.batches.find((b) => b.id === batchId));
	let articles = $derived.by(() => {
		if (!batch || !worksetStore.workset) return [];
		return articlesForBatch(worksetStore.workset, batch);
	});

	let actUpdates = $derived.by(() => {
		if (!batch || !worksetStore.workset) return [];
		return actUpdatesForBatch(worksetStore.workset, batch);
	});

	let isUpdatesTask = $derived.by(() => {
		return Boolean(worksetStore.workset?.jobTitle && (worksetStore.workset.actUpdates?.length || 0) > 0);
	});

	function deduplicateRelations(rels: ExtractedRelation[]): ExtractedRelation[] {
		const seen = new Set<string>();
		return rels.filter((r) => {
			const actId = r.source_act ? `${(r.source_act as any).type || ''}_${(r.source_act as any).number || ''}_${(r.source_act as any).year || ''}` : '';
			const k = `${r.entry_index || ''}_${actId}_${r.source_article || ''}_${r.target_article || ''}_${r.target_paragraph || ''}_${r.family || ''}_${r.relation_type || ''}_${(r.evidence || '').slice(0, 40)}`;
			if (seen.has(k)) return false;
			seen.add(k);
			return true;
		});
	}

	let reportChatGPT = $derived.by(() => {
		const raw = batch?.rawResponseChatGPT || (batch?.provider === 'chatgpt' ? batch?.rawResponse : null);
		if (!raw || raw.trim().length < 20) return null;
		const parsed = parseAiResponse(raw);
		return { ...parsed, relations: deduplicateRelations(parsed.relations || []) };
	});

	let reportGemini = $derived.by(() => {
		const raw = batch?.rawResponseGemini || (batch?.provider === 'gemini' ? batch?.rawResponse : null);
		if (!raw || raw.trim().length < 20) return null;
		const parsed = parseAiResponse(raw);
		return { ...parsed, relations: deduplicateRelations(parsed.relations || []) };
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
		const agreed: ExtractedRelation[] = [];
		const onlyChatGPT: ExtractedRelation[] = [];
		const onlyGemini: ExtractedRelation[] = [];

		for (const g of articleComparisonGrouped) {
			agreed.push(...g.agreed);
			onlyChatGPT.push(...g.onlyChatGPT);
			onlyGemini.push(...g.onlyGemini);
		}

		return { agreed, onlyChatGPT, onlyGemini };
	});

	function computeUpdateRelationScore(rel: ExtractedRelation, update: any): number {
		if (!update) return -100;
		let score = 0;

		const targetClean = String(rel.target_article || '').replace(/[^0-9]/g, '');
		const text = (update.testo_disposizione || '').toLowerCase();
		const actHeading = (update.atto_modificante || '').toLowerCase();

		// 1. Articolo bersaglio: TASSATIVO. Se la disposizione non cita l'articolo target, scarto totale (-100)
		if (targetClean) {
			let targetFound = false;
			if (update.target_articles_detected && Array.isArray(update.target_articles_detected)) {
				const detectedNums = update.target_articles_detected.map((t: string) =>
					String(t).replace(/[^0-9]/g, '')
				);
				if (detectedNums.includes(targetClean)) {
					score += 20;
					targetFound = true;
				}
			}
			const targetRegex = new RegExp(`\\b(?:art(?:icolo)?\\.?|articoli)\\s*${targetClean}\\b`, 'i');
			if (targetRegex.test(text)) {
				score += 20;
				targetFound = true;
			}
			if (!targetFound) {
				return -100;
			}
		}

		// 2. Atto Modificante (tipo, numero, anno): FONDAMENTALE per non mischiare leggi diverse
		if (rel.source_act) {
			const srcNum = rel.source_act.number ? String(rel.source_act.number).trim() : '';
			const srcYear = rel.source_act.year ? String(rel.source_act.year).trim() : '';
			const srcType = rel.source_act.type ? String(rel.source_act.type).toLowerCase() : '';

			if (srcNum) {
				const numRegex = new RegExp(`\\b(?:n\\.?|no?\\.?|numero)\\s*${srcNum}\\b|\\b${srcNum}\\b`, 'i');
				if (numRegex.test(actHeading)) {
					score += 40;
				} else {
					return -100;
				}
			}

			if (srcYear) {
				if (actHeading.includes(srcYear) || (update.data_pubblicazione && update.data_pubblicazione.includes(srcYear))) {
					score += 25;
				} else {
					return -100;
				}
			}

			if (srcType) {
				if (
					(srcType.includes('decreto') && actHeading.includes('decreto')) ||
					(srcType.includes('legge') && actHeading.includes('legge')) ||
					(srcType.includes('regio') && actHeading.includes('regio'))
				) {
					score += 10;
				}
			}
		}

		// 3. Comma o paragrafo specifico
		const targetParagraph = String(rel.target_paragraph || '').replace(/[^0-9]/g, '');
		if (targetParagraph) {
			const commaRegex = new RegExp(`\\b(?:comma|c\\.)\\s*${targetParagraph}\\b`, 'i');
			if (commaRegex.test(text)) {
				score += 15;
			}
		}

		// 4. Testo di evidenza (senza preambolo boilerplate)
		if (rel.evidence) {
			const cleanEv = rel.evidence.toLowerCase().replace(/^ha\s+disposto\s*(?:\([^)]*\))?\s*/i, '').trim();
			const cleanArt = text.replace(/^ha\s+disposto\s*(?:\([^)]*\))?\s*/i, '').trim();
			if (cleanEv.length > 8 && cleanArt.length > 8) {
				const snippet = cleanEv.slice(0, 30);
				if (cleanArt.includes(snippet)) {
					score += 25;
				}
			}
		}

		return score;
	}

	function matchesItemRelation(
		rel: ExtractedRelation,
		artNum: string,
		idx: number,
		matchingUpdate: any,
		articleText: string,
		totalBatchItems: number
	): boolean {
		if (totalBatchItems === 1) return true;

		// Se la relazione contiene un entry_index deterministico
		if (rel.entry_index && Number.isInteger(rel.entry_index)) {
			return rel.entry_index === idx + 1;
		}

		// Per i normali task di articoli di legge (es. Codice Civile)
		const s = String(rel.source_article || '').trim().toLowerCase();
		const sNum = s.replace(/[^0-9]/g, '');

		const artNumClean = String(artNum).trim().toLowerCase();
		const artNumDigits = artNumClean.replace(/[^0-9]/g, '');

		// 1. Exact Article Number Match
		if (sNum && artNumDigits && sNum === artNumDigits) {
			return true;
		}

		// 2. Textual String Match
		if (s && (s === artNumClean || s === `art. ${artNumClean}`)) {
			return true;
		}

		// 3. Evidence Text Substring match
		if (rel.evidence && articleText && articleText.length > 10) {
			const evidenceClean = rel.evidence.trim().toLowerCase().slice(0, 30);
			if (evidenceClean.length > 5 && articleText.toLowerCase().includes(evidenceClean)) {
				return true;
			}
		}

		return false;
	}

	let articleComparisonGrouped = $derived.by(() => {
		if (!batch) return [];
		const chatGptRels = reportChatGPT?.relations || [];
		const geminiRels = reportGemini?.relations || [];
		const totalItems = batch.articleNumbers.length;

		if (isUpdatesTask) {
			const updatesList = batch.articleNumbers.map((artNum, idx) => {
				const matchingUpdate = actUpdates[idx] || actUpdates.find(
					(u) => String(u.progr) === artNum
				);

				const targetsSummary = matchingUpdate?.target_articles_detected?.length
					? matchingUpdate.target_articles_detected.slice(0, 3).join(', ')
					: null;

				const itemTitle = matchingUpdate
					? `Novella Progr. ${matchingUpdate.progr || idx + 1}${matchingUpdate.data_pubblicazione ? ` (G.U. ${matchingUpdate.data_pubblicazione})` : ''} · Voce #${idx + 1}${targetsSummary ? ` [${targetsSummary}]` : ''}`
					: `Novella #${artNum}`;
				const itemSubtitle = matchingUpdate?.atto_modificante || '';
				const articleText = matchingUpdate?.testo_disposizione || `Testo della novella in caricamento.`;
				const rubrica = itemSubtitle;

				return {
					articleNum: artNum,
					idx,
					matchingUpdate,
					itemTitle,
					itemSubtitle,
					articleText,
					rubrica,
					finalC: [] as ExtractedRelation[],
					finalG: [] as ExtractedRelation[]
				};
			});

			// Assegnazione deterministica tramite entry_index; fallback al punteggio semantico se assente
			for (const rel of chatGptRels) {
				if (rel.entry_index && rel.entry_index >= 1 && rel.entry_index <= updatesList.length) {
					updatesList[rel.entry_index - 1].finalC.push(rel);
					continue;
				}

				let bestIdx = -1;
				let bestScore = 0;

				for (let i = 0; i < updatesList.length; i++) {
					const score = computeUpdateRelationScore(rel, updatesList[i].matchingUpdate);
					if (score > bestScore) {
						bestScore = score;
						bestIdx = i;
					}
				}

				if (bestIdx >= 0) {
					updatesList[bestIdx].finalC.push(rel);
				}
			}

			for (const rel of geminiRels) {
				if (rel.entry_index && rel.entry_index >= 1 && rel.entry_index <= updatesList.length) {
					updatesList[rel.entry_index - 1].finalG.push(rel);
					continue;
				}

				let bestIdx = -1;
				let bestScore = 0;

				for (let i = 0; i < updatesList.length; i++) {
					const score = computeUpdateRelationScore(rel, updatesList[i].matchingUpdate);
					if (score > bestScore) {
						bestScore = score;
						bestIdx = i;
					}
				}

				if (bestIdx >= 0) {
					updatesList[bestIdx].finalG.push(rel);
				}
			}

			return updatesList.map((g) => {
				const agreed: ExtractedRelation[] = [];
				const onlyChatGPT: ExtractedRelation[] = [];
				const onlyGemini: ExtractedRelation[] = [];

				for (const cRel of g.finalC) {
					const cTgt = (cRel.target_article || '').replace(/[^0-9]/g, '');
					const matched = g.finalG.find((gRel) => {
						const gTgt = (gRel.target_article || '').replace(/[^0-9]/g, '');
						return (cTgt && gTgt && cTgt === gTgt) || cRel.target_article === gRel.target_article;
					});
					if (matched) agreed.push(cRel);
					else onlyChatGPT.push(cRel);
				}

				for (const gRel of g.finalG) {
					const gTgt = (gRel.target_article || '').replace(/[^0-9]/g, '');
					const matched = g.finalC.find((cRel) => {
						const cTgt = (cRel.target_article || '').replace(/[^0-9]/g, '');
						return (cTgt && gTgt && cTgt === gTgt) || cRel.target_article === gRel.target_article;
					});
					if (!matched) onlyGemini.push(gRel);
				}

				return {
					articleNum: g.articleNum,
					itemTitle: g.itemTitle,
					itemSubtitle: g.itemSubtitle,
					articleText: g.articleText,
					rubrica: g.rubrica,
					artCandidates: (g.matchingUpdate?.target_articles_detected || []).map((t: string) => ({
						articleNum: g.articleNum,
						text: `art. ${t}`,
						label: 'Bersaglio Rilevato'
					})),
					cForArt: g.finalC,
					gForArt: g.finalG,
					agreed,
					onlyChatGPT,
					onlyGemini,
					missingCandidates: []
				};
			});
		}

		return batch.articleNumbers.map((artNum, idx) => {
			const numClean = artNum.replace(/[^0-9]/g, '');

			const matchingArt = articles.find(
				(a) => a.numero === artNum || a.numero.replace(/[^0-9]/g, '') === numClean
			);
			const articleText = matchingArt?.testo || `Testo dell'articolo ${artNum} in caricamento dall'attività.`;
			const rubrica = matchingArt?.rubrica || '';

			const finalC = chatGptRels.filter((r) =>
				matchesItemRelation(r, artNum, idx, null, articleText, totalItems)
			);
			const finalG = geminiRels.filter((r) =>
				matchesItemRelation(r, artNum, idx, null, articleText, totalItems)
			);

			const agreed: ExtractedRelation[] = [];
			const onlyChatGPT: ExtractedRelation[] = [];
			const onlyGemini: ExtractedRelation[] = [];

			for (const cRel of finalC) {
				const cTgt = (cRel.target_article || '').replace(/[^0-9]/g, '');
				const matched = finalG.find((gRel) => {
					const gTgt = (gRel.target_article || '').replace(/[^0-9]/g, '');
					return (cTgt && gTgt && cTgt === gTgt) || cRel.target_article === gRel.target_article;
				});
				if (matched) agreed.push(cRel);
				else onlyChatGPT.push(cRel);
			}

			for (const gRel of finalG) {
				const gTgt = (gRel.target_article || '').replace(/[^0-9]/g, '');
				const matched = finalC.find((cRel) => {
					const cTgt = (cRel.target_article || '').replace(/[^0-9]/g, '');
					return (cTgt && gTgt && cTgt === gTgt) || cRel.target_article === gRel.target_article;
				});
				if (!matched) onlyGemini.push(gRel);
			}

			return {
				articleNum: artNum,
				itemTitle: `Articolo ${artNum}`,
				itemSubtitle: rubrica,
				articleText,
				rubrica,
				artCandidates: [],
				cForArt: finalC,
				gForArt: finalG,
				agreed,
				onlyChatGPT,
				onlyGemini,
				missingCandidates: []
			};
		});
	});

	type FilterOption = 'all' | 'pending' | 'approved' | 'rejected' | 'concordant' | 'only_chatgpt' | 'only_gemini';
	let activeFilter = $state<FilterOption>('all');

	let filteredArticleComparisonGrouped = $derived.by(() => {
		if (activeFilter === 'all') return articleComparisonGrouped;

		return articleComparisonGrouped
			.map((group) => {
				const filterRel = (rel: ExtractedRelation, prefix: string, idx: number) => {
					const k = getRelKey(rel, `${prefix}_${group.articleNum}`, idx);
					const status = getDecision(k);

					if (activeFilter === 'pending') return status === 'pending';
					if (activeFilter === 'approved') return status === 'approved';
					if (activeFilter === 'rejected') return status === 'rejected';
					return true;
				};

				let agreed = group.agreed;
				let onlyChatGPT = group.onlyChatGPT;
				let onlyGemini = group.onlyGemini;

				if (activeFilter === 'concordant') {
					onlyChatGPT = [];
					onlyGemini = [];
				} else if (activeFilter === 'only_chatgpt') {
					agreed = [];
					onlyGemini = [];
				} else if (activeFilter === 'only_gemini') {
					agreed = [];
					onlyChatGPT = [];
				} else if (activeFilter === 'pending' || activeFilter === 'approved' || activeFilter === 'rejected') {
					agreed = agreed.filter((rel, idx) => filterRel(rel, 'agreed', idx));
					onlyChatGPT = onlyChatGPT.filter((rel, idx) => filterRel(rel, 'chatgpt', idx));
					onlyGemini = onlyGemini.filter((rel, idx) => filterRel(rel, 'gemini', idx));
				}

				return {
					...group,
					agreed,
					onlyChatGPT,
					onlyGemini
				};
			})
			.filter((group) => group.agreed.length > 0 || group.onlyChatGPT.length > 0 || group.onlyGemini.length > 0);
	});

	let unassignedChatGPTRels = $derived.by(() => {
		if (!isUpdatesTask || !reportChatGPT?.relations) return [];
		const allAssigned = new Set(articleComparisonGrouped.flatMap((g) => g.cForArt));
		return (reportChatGPT.relations || []).filter((r) => !allAssigned.has(r));
	});

	let unassignedGeminiRels = $derived.by(() => {
		if (!isUpdatesTask || !reportGemini?.relations) return [];
		const allAssigned = new Set(articleComparisonGrouped.flatMap((g) => g.gForArt));
		return (reportGemini.relations || []).filter((r) => !allAssigned.has(r));
	});
	let unassignedExpanded = $state(false);

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

	let confirmState = $state<{
		isOpen: boolean;
		title: string;
		message: string;
		confirmText?: string;
		variant?: 'emerald' | 'purple' | 'amber' | 'rose';
		action?: () => void;
	}>({
		isOpen: false,
		title: '',
		message: ''
	});

	async function approveAllAgreed() {
		if (!consensusAnalysis) return;
		for (const artGroup of articleComparisonGrouped) {
			artGroup.agreed.forEach((rel, aIdx) => {
				relationDecisions[getRelKey(rel, `agreed_${artGroup.articleNum}`, aIdx)] = 'approved';
			});
		}
		await saveReconciledProposal();
	}

	async function approveAll() {
		for (const artGroup of articleComparisonGrouped) {
			artGroup.agreed.forEach((rel, aIdx) => {
				relationDecisions[getRelKey(rel, `agreed_${artGroup.articleNum}`, aIdx)] = 'approved';
			});
			artGroup.onlyChatGPT.forEach((rel, cIdx) => {
				relationDecisions[getRelKey(rel, `chatgpt_${artGroup.articleNum}`, cIdx)] = 'approved';
			});
			artGroup.onlyGemini.forEach((rel, gIdx) => {
				relationDecisions[getRelKey(rel, `gemini_${artGroup.articleNum}`, gIdx)] = 'approved';
			});
		}
		await saveReconciledProposal();
	}

	async function approveNovellaGroup(articleNum: string) {
		const artGroup = articleComparisonGrouped.find((g) => g.articleNum === articleNum);
		if (!artGroup) return;
		artGroup.agreed.forEach((rel, aIdx) => {
			relationDecisions[getRelKey(rel, `agreed_${artGroup.articleNum}`, aIdx)] = 'approved';
		});
		artGroup.onlyChatGPT.forEach((rel, cIdx) => {
			relationDecisions[getRelKey(rel, `chatgpt_${artGroup.articleNum}`, cIdx)] = 'approved';
		});
		artGroup.onlyGemini.forEach((rel, gIdx) => {
			relationDecisions[getRelKey(rel, `gemini_${artGroup.articleNum}`, gIdx)] = 'approved';
		});
		await saveReconciledProposal();
	}

	function handleConfirmModal() {
		if (confirmState.action) {
			confirmState.action();
		}
		confirmState.isOpen = false;
	}

	function handleCancelModal() {
		confirmState.isOpen = false;
	}

	async function resetDecisions() {
		const pendingDecisions: Record<string, 'approved' | 'rejected' | 'pending'> = {};
		for (const artGroup of articleComparisonGrouped) {
			artGroup.agreed.forEach((rel, aIdx) => {
				pendingDecisions[getRelKey(rel, `agreed_${artGroup.articleNum}`, aIdx)] = 'pending';
			});
			artGroup.onlyChatGPT.forEach((rel, cIdx) => {
				pendingDecisions[getRelKey(rel, `chatgpt_${artGroup.articleNum}`, cIdx)] = 'pending';
			});
			artGroup.onlyGemini.forEach((rel, gIdx) => {
				pendingDecisions[getRelKey(rel, `gemini_${artGroup.articleNum}`, gIdx)] = 'pending';
			});
		}
		relationDecisions = pendingDecisions;
		editedRelations = {};
		saveSuccess = undefined;
		saveWarning = undefined;

		// Persiste lo stato resettato su IndexedDB
		if (worksetStore.workset && batch) {
			await updateBatch(worksetStore.workset.jobId, batch.id, {
				relationDecisions: pendingDecisions,
				editedRelations: {},
				status: 'awaiting_ai',
				relations: []
			});
			await worksetStore.load(worksetStore.workset.jobId);
		}
	}

	let totalBatchRelations = $derived.by(() => {
		let total = 0;
		for (const g of articleComparisonGrouped) {
			total += g.agreed.length + g.onlyChatGPT.length + g.onlyGemini.length;
		}
		return total;
	});

	let approvedCount = $derived.by(() => {
		return Object.values(relationDecisions).filter((v) => v === 'approved').length;
	});

	let rejectedCount = $derived.by(() => {
		return Object.values(relationDecisions).filter((v) => v === 'rejected').length;
	});

	let pendingCount = $derived.by(() => {
		return Math.max(0, totalBatchRelations - approvedCount - rejectedCount);
	});

	let initializedForBatchId = $state<string | null>(null);

	// Ripristina decisioni e modifiche salvate al caricamento del batch
	$effect(() => {
		if (batch && batch.id !== initializedForBatchId) {
			initializedForBatchId = batch.id;
			if (batch.relationDecisions && Object.keys(batch.relationDecisions).length > 0) {
				relationDecisions = { ...batch.relationDecisions };
			} else if (batch.status === 'imported' && batch.relations && batch.relations.length > 0) {
				const newDecisions: Record<string, 'approved' | 'rejected' | 'pending'> = {};
				for (const artGroup of articleComparisonGrouped) {
					artGroup.agreed.forEach((rel, aIdx) => {
						newDecisions[getRelKey(rel, `agreed_${artGroup.articleNum}`, aIdx)] = 'approved';
					});
				}
				relationDecisions = newDecisions;
			}

			if (batch.editedRelations && Object.keys(batch.editedRelations).length > 0) {
				editedRelations = { ...batch.editedRelations };
			}
		}
	});

	async function saveReconciledProposal() {
		saving = true;
		saveWarning = undefined;
		saveSuccess = undefined;
		try {
			const seenKeys = new Set<string>();
			const approvedRels: ExtractedRelation[] = [];

			const addUnique = (rel: ExtractedRelation) => {
				const actId = rel.source_act ? `${(rel.source_act as any).type || ''}_${(rel.source_act as any).number || ''}_${(rel.source_act as any).year || ''}` : '';
				const uKey = `${rel.entry_index || ''}_${actId}_${rel.source_article || ''}_${rel.target_article || ''}_${rel.target_paragraph || ''}_${rel.family || ''}_${rel.relation_type || ''}_${(rel.evidence || '').slice(0, 40)}`;
				if (!seenKeys.has(uKey)) {
					seenKeys.add(uKey);
					approvedRels.push(rel);
				}
			};

			for (const artGroup of articleComparisonGrouped) {
				artGroup.agreed.forEach((rel, aIdx) => {
					const k = getRelKey(rel, `agreed_${artGroup.articleNum}`, aIdx);
					const status = getDecision(k);
					if (status === 'approved' || status === 'pending') {
						addUnique(editedRelations[k] || rel);
					}
				});
				artGroup.onlyChatGPT.forEach((rel, cIdx) => {
					const k = getRelKey(rel, `chatgpt_${artGroup.articleNum}`, cIdx);
					const status = getDecision(k);
					if (status === 'approved') {
						addUnique(editedRelations[k] || rel);
					}
				});
				artGroup.onlyGemini.forEach((rel, gIdx) => {
					const k = getRelKey(rel, `gemini_${artGroup.articleNum}`, gIdx);
					const status = getDecision(k);
					if (status === 'approved') {
						addUnique(editedRelations[k] || rel);
					}
				});
			}

			const jsonText = JSON.stringify({ relations: approvedRels }, null, 2);
			
			// Salva sia su ChatGPT che su Gemini mantenendo persistenti le decisioni dell'utente
			saveWarning = await worksetStore.importResponse(batchId, jsonText, 'chatgpt', relationDecisions, editedRelations);
			await worksetStore.importResponse(batchId, jsonText, 'gemini', relationDecisions, editedRelations);

			void activityStore.refresh();
			saveSuccess = `Batch ${batchId} salvato con successo! La scheda dell'attività Civitas "${worksetStore.workset?.jobTitle || ''}" è stata aggiornata con ${approvedRels.length} relazioni approvate.`;
		} finally {
			saving = false;
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
				{worksetStore.workset?.jobTitle || ''} · 
				{#if isUpdatesTask}
					{batch?.articleNumbers.length || 0} novelle legislative comprese
				{:else}
					{articles.length} articoli compresi: artt. {batch?.articleNumbers.join(', ') || ''}
				{/if}
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

			<!-- RIGHE STATISTICHE STATO RICONCILIAZIONE (4 SCHEDE: APPROVATE, RIFIUTATE, DA VALUTARE, TOTALE) -->
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
				<div class="p-3.5 bg-emerald-50 text-emerald-950 rounded-xl border border-emerald-300 shadow-2xs">
					<div class="flex items-center justify-between">
						<span class="text-2xl font-extrabold text-emerald-800">{approvedCount}</span>
						<span class="text-sm font-extrabold text-emerald-700">✓</span>
					</div>
					<span class="text-[10px] uppercase font-bold tracking-wider text-emerald-900 block mt-1">Approvate</span>
				</div>

				<div class="p-3.5 bg-rose-50 text-rose-950 rounded-xl border border-rose-300 shadow-2xs">
					<div class="flex items-center justify-between">
						<span class="text-2xl font-extrabold text-rose-800">{rejectedCount}</span>
						<span class="text-sm font-extrabold text-rose-700">✕</span>
					</div>
					<span class="text-[10px] uppercase font-bold tracking-wider text-rose-900 block mt-1">Rifiutate</span>
				</div>

				<div class="p-3.5 bg-amber-50 text-amber-950 rounded-xl border border-amber-300 shadow-2xs">
					<div class="flex items-center justify-between">
						<span class="text-2xl font-extrabold text-amber-800">{pendingCount}</span>
						<span class="text-sm font-extrabold text-amber-700">⚖️</span>
					</div>
					<span class="text-[10px] uppercase font-bold tracking-wider text-amber-900 block mt-1">Da Approvare Ancora</span>
				</div>

				<div class="p-3.5 bg-stone-100 text-stone-900 rounded-xl border border-stone-300 shadow-2xs">
					<div class="flex items-center justify-between">
						<span class="text-2xl font-extrabold text-stone-800">{totalBatchRelations}</span>
						<span class="text-sm font-extrabold text-stone-600">📊</span>
					</div>
					<span class="text-[10px] uppercase font-bold tracking-wider text-stone-700 block mt-1">Totale Relazioni</span>
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
							disabled={saving}
							class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
						>
							{#if saving}
								<Spinner />
								<span>Salvataggio...</span>
							{:else}
								<Check class="w-4 h-4 text-white" />
								<span>Approva Tutte le Concordanti</span>
							{/if}
						</button>
						<button
							type="button"
							onclick={approveAll}
							disabled={saving}
							class="px-3.5 py-1.5 rounded-lg bg-purple-100 text-purple-900 border border-purple-300 font-bold hover:bg-purple-200 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
						>
							{#if saving}
								<Spinner />
							{:else}
								<Check class="w-3.5 h-3.5 text-purple-700" />
							{/if}
							<span>Approva Tutte le Relazioni</span>
						</button>
						<button
							type="button"
							onclick={resetDecisions}
							disabled={saving}
							class="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 border border-stone-300 font-medium hover:bg-stone-200 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
						>
							<RotateCcw class="w-3.5 h-3.5 text-stone-600" /> Resetta decisioni
						</button>
					</div>
				</div>

				{#if saveSuccess}
					<div class="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-950 font-medium animate-in fade-in">
						<div class="flex items-center gap-2">
							<Check class="w-4 h-4 text-emerald-700 shrink-0" />
							<span>{saveSuccess}</span>
						</div>
						<button
							type="button"
							onclick={() => router.toJob(jobId)}
							class="font-bold underline text-emerald-800 hover:text-emerald-950 cursor-pointer ml-3 shrink-0"
						>
							Vai alla Scheda Task &rarr;
						</button>
					</div>
				{/if}

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
				{#if isUpdatesTask}
					Analisi Comparativa Dettagliata per Novella Legislativa
				{:else}
					Analisi Comparativa Dettagliata Articolo per Articolo
				{/if}
			</h2>

			<!-- BARRA FILTRI DI VISUALIZZAZIONE -->
			<div class="flex items-center justify-between flex-wrap gap-2 bg-stone-100/80 p-2.5 rounded-xl border border-stone-200 shadow-2xs">
				<span class="text-xs font-bold text-stone-700 flex items-center gap-1.5 px-1 font-display">
					<Filter class="w-4 h-4 text-purple-700" /> Filtra Vista:
				</span>
				<div class="flex items-center gap-1.5 flex-wrap text-xs">
					<button
						type="button"
						onclick={() => (activeFilter = 'all')}
						class="px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer {activeFilter === 'all' ? 'bg-stone-900 text-white shadow-2xs' : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-250'}"
					>
						Tutte ({totalBatchRelations})
					</button>
					<button
						type="button"
						onclick={() => (activeFilter = 'pending')}
						class="px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer {activeFilter === 'pending' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-amber-50 text-amber-900 border border-amber-250 hover:bg-amber-100'}"
					>
						⚖️ Da Approvare ({pendingCount})
					</button>
					<button
						type="button"
						onclick={() => (activeFilter = 'approved')}
						class="px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer {activeFilter === 'approved' ? 'bg-emerald-700 text-white shadow-2xs' : 'bg-emerald-50 text-emerald-900 border border-emerald-250 hover:bg-emerald-100'}"
					>
						✓ Approvate ({approvedCount})
					</button>
					<button
						type="button"
						onclick={() => (activeFilter = 'rejected')}
						class="px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer {activeFilter === 'rejected' ? 'bg-rose-700 text-white shadow-2xs' : 'bg-rose-50 text-rose-900 border border-rose-250 hover:bg-rose-100'}"
					>
						✕ Rifiutate ({rejectedCount})
					</button>
					<button
						type="button"
						onclick={() => (activeFilter = 'concordant')}
						class="px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer {activeFilter === 'concordant' ? 'bg-emerald-800 text-white shadow-2xs' : 'bg-white text-emerald-950 border border-emerald-250 hover:bg-emerald-50'}"
					>
						In Comune ({consensusAnalysis?.agreed.length || 0})
					</button>
					<button
						type="button"
						onclick={() => (activeFilter = 'only_chatgpt')}
						class="px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer {activeFilter === 'only_chatgpt' ? 'bg-purple-800 text-white shadow-2xs' : 'bg-purple-50 text-purple-950 border border-purple-250 hover:bg-purple-100'}"
					>
						Esclusive ChatGPT ({consensusAnalysis?.onlyChatGPT.length || 0})
					</button>
					<button
						type="button"
						onclick={() => (activeFilter = 'only_gemini')}
						class="px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer {activeFilter === 'only_gemini' ? 'bg-blue-800 text-white shadow-2xs' : 'bg-blue-50 text-blue-950 border border-blue-250 hover:bg-blue-100'}"
					>
						Esclusive Gemini ({consensusAnalysis?.onlyGemini.length || 0})
					</button>
				</div>
			</div>

			<div class="space-y-4">
				{#if filteredArticleComparisonGrouped.length === 0}
					<div class="p-8 bg-stone-50 border border-stone-200 rounded-2xl text-center text-xs text-stone-500 font-medium">
						Nessuna relazione corrisponde al filtro selezionato ("{activeFilter}").
					</div>
				{:else}
					{#each filteredArticleComparisonGrouped as artGroup (artGroup.articleNum)}
					{#if activeFilter === 'all' || artGroup.agreed.length > 0 || artGroup.onlyChatGPT.length > 0 || artGroup.onlyGemini.length > 0 || artGroup.artCandidates.length > 0}
						<ArticleComparisonGroup
							{artGroup}
							{editedRelations}
							{relationDecisions}
							{allLocalWorksets}
							{articles}
							currentJobTitle={worksetStore.workset?.jobTitle || ''}
							{isUpdatesTask}
							{expandedArticles}
							{expandedCandidates}
							onToggleArticleText={toggleArticleText}
							onToggleCandidates={toggleInitialCandidates}
							onToggleDecision={toggleDecision}
							onStartEdit={startEdit}
							onApproveNovella={approveNovellaGroup}
						/>
					{/if}
				{/each}
				{/if}

				<!-- RELAZIONI NON APPARTENENTI A QUESTO BATCH (ES. OVERFLOW DA PROMPT PRECEDENTI) -->
				{#if unassignedChatGPTRels.length > 0 || unassignedGeminiRels.length > 0}
					<div class="p-4 bg-purple-50/60 border border-purple-250 rounded-2xl space-y-2.5 text-xs shadow-2xs">
						<button
							type="button"
							onclick={() => (unassignedExpanded = !unassignedExpanded)}
							class="w-full flex items-center justify-between text-purple-950 font-bold text-left cursor-pointer hover:underline"
						>
							<span class="flex items-center gap-2">
								<Layers class="w-4 h-4 text-purple-700 shrink-0" />
								Ulteriori relazioni nella risposta AI non appartenenti a queste 5 disposizioni ({unassignedChatGPTRels.length + unassignedGeminiRels.length})
							</span>
							{#if unassignedExpanded}
								<ChevronUp class="w-4 h-4 text-purple-800" />
							{:else}
								<ChevronDown class="w-4 h-4 text-purple-800" />
							{/if}
						</button>
						<p class="text-[11px] text-purple-900/80">
							Queste relazioni estratte dall'AI fanno riferimento ad altri articoli bersaglio dell'atto non inclusi nelle disposizioni di questo batch. Vengono isolate qui per non inquinare le schede delle disposizioni attuali.
						</p>
						{#if unassignedExpanded}
							<div class="space-y-2 pt-2 max-h-[300px] overflow-y-auto">
								{#each unassignedChatGPTRels as rel, idx (`extra_c_${idx}`)}
									<div class="p-2.5 bg-white rounded-lg border border-purple-200 text-xs flex items-center justify-between gap-2">
										<div class="min-w-0">
											<span class="font-bold text-purple-950 block font-mono">
												🎯 Target: art. {rel.target_article || '-'}{rel.target_paragraph ? `, comma ${rel.target_paragraph}` : ''} ({rel.relation_type || 'MODIFICA'})
											</span>
											{#if rel.evidence}
												<span class="text-[11px] text-stone-600 truncate block italic">"{rel.evidence}"</span>
											{/if}
										</div>
										<Badge variant="purple">Altro Articolo</Badge>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
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

<RelationEditModal
	bind:editingDraft
	{editingArticleTitle}
	{editingArticleText}
	{allLocalWorksets}
	{articles}
	currentJobTitle={worksetStore.workset?.jobTitle || ''}
	{expandedArticles}
	onSave={saveEdit}
	onCancel={cancelEdit}
	onToggleArticleText={toggleArticleText}
/>

<ConfirmModal
	isOpen={confirmState.isOpen}
	title={confirmState.title}
	message={confirmState.message}
	confirmText={confirmState.confirmText}
	variant={confirmState.variant}
	onConfirm={handleConfirmModal}
	onCancel={handleCancelModal}
/>
