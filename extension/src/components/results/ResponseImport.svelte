<script lang="ts">
	import {
		ClipboardPaste,
		CheckCircle2,
		ShieldAlert,
		Sparkles,
		Layers,
		HelpCircle,
		BarChart3,
		Columns
	} from 'lucide-svelte';
	import Button from '@/components/ui/Button.svelte';
	import Alert from '@/components/ui/Alert.svelte';
	import Badge from '@/components/ui/Badge.svelte';
	import TextArea from '@/components/ui/TextArea.svelte';
	import { worksetStore } from '@/stores/workset.svelte';
	import { openDashboard } from '@/services/browser/browserService';
	import { parseAiResponse, MIN_RESPONSE_LENGTH } from '@/features/results/responseParser';
	import type { WorksetBatch, ExtractedRelation } from '@/domain/workset';
	import type { ProviderId } from '@/domain/prompt';

	interface Props {
		batch: WorksetBatch;
	}

	let { batch }: Props = $props();

	let activeProviderTab = $state<'chatgpt' | 'gemini' | 'both' | 'compare'>('chatgpt');

	let draftChatGPT = $state('');
	let draftGemini = $state('');

	let warning = $state<string | undefined>(undefined);
	let saving = $state(false);
	let loadedBatchId = $state<string | null>(null);

	$effect(() => {
		if (loadedBatchId === batch.id) return;
		loadedBatchId = batch.id;
		draftChatGPT = batch.rawResponseChatGPT ?? (batch.provider === 'chatgpt' ? batch.rawResponse ?? '' : '');
		draftGemini = batch.rawResponseGemini ?? (batch.provider === 'gemini' ? batch.rawResponse ?? '' : '');
		if (batch.provider === 'gemini') activeProviderTab = 'gemini';
		else activeProviderTab = 'chatgpt';
		warning = batch.parseWarning;
	});

	function handleChatGPTInput(val: string) {
		draftChatGPT = val;
		if (batch) {
			void worksetStore.saveDraftResponses(batch.id, draftChatGPT, draftGemini);
		}
	}

	function handleGeminiInput(val: string) {
		draftGemini = val;
		if (batch) {
			void worksetStore.saveDraftResponses(batch.id, draftChatGPT, draftGemini);
		}
	}

	let currentCandidates = $derived.by(() => {
		const ws = worksetStore.workset;
		if (!ws) return [];
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

	// ANALISI AUTOMATICA IN TEMPO REALE ALL'INCOLLA
	let reportChatGPT = $derived.by(() => {
		if (draftChatGPT.trim().length < MIN_RESPONSE_LENGTH) return null;
		return parseAiResponse(draftChatGPT);
	});

	let reportGemini = $derived.by(() => {
		if (draftGemini.trim().length < MIN_RESPONSE_LENGTH) return null;
		return parseAiResponse(draftGemini);
	});

	function computeModelDiff(relations: ExtractedRelation[]) {
		const matchedCandidateIds = new Set<string>();
		const confirmed: ExtractedRelation[] = [];
		const added: ExtractedRelation[] = [];

		for (const rel of relations) {
			const targetNum = (rel.target_article || '').replace(/[^0-9]/g, '');
			const matched = currentCandidates.find((c) => {
				const cNum = c.text.replace(/[^0-9]/g, '');
				return cNum && targetNum && cNum === targetNum;
			});

			if (matched) {
				matchedCandidateIds.add(matched.id || matched.text);
				confirmed.push(rel);
			} else {
				added.push(rel);
			}
		}

		const removedCandidates = currentCandidates.filter(
			(c) => !matchedCandidateIds.has(c.id || c.text)
		);

		return { confirmed, added, removedCandidates };
	}

	let diffChatGPT = $derived.by(() => {
		if (!reportChatGPT) return null;
		return computeModelDiff(reportChatGPT.relations);
	});

	let diffGemini = $derived.by(() => {
		if (!reportGemini) return null;
		return computeModelDiff(reportGemini.relations);
	});

	let consensusAnalysis = $derived.by(() => {
		if (!reportChatGPT && !reportGemini) return null;

		const chatGptRels = reportChatGPT?.relations || [];
		const geminiRels = reportGemini?.relations || [];

		const agreed: ExtractedRelation[] = [];
		const onlyChatGPT: ExtractedRelation[] = [];
		const onlyGemini: ExtractedRelation[] = [];

		for (const cRel of chatGptRels) {
			const cTarget = (cRel.target_article || '').replace(/[^0-9]/g, '');
			const inGemini = geminiRels.some((gRel) => {
				const gTarget = (gRel.target_article || '').replace(/[^0-9]/g, '');
				return (
					(cTarget && gTarget && cTarget === gTarget) ||
					cRel.target_article === gRel.target_article
				);
			});
			if (inGemini) agreed.push(cRel);
			else onlyChatGPT.push(cRel);
		}

		for (const gRel of geminiRels) {
			const gTarget = (gRel.target_article || '').replace(/[^0-9]/g, '');
			const inChatGPT = chatGptRels.some((cRel) => {
				const cTarget = (cRel.target_article || '').replace(/[^0-9]/g, '');
				return (
					(cTarget && gTarget && cTarget === gTarget) ||
					cRel.target_article === gRel.target_article
				);
			});
			if (!inChatGPT) onlyGemini.push(gRel);
		}

		return { agreed, onlyChatGPT, onlyGemini };
	});

	function openFullDashboardCompare() {
		const jobId = worksetStore.workset?.jobId || '';
		void openDashboard(`#/job/${encodeURIComponent(jobId)}/batch/${batch.id}/compare`);
	}
</script>

<div class="bg-white border border-[#E7DFD5] rounded-2xl p-4 shadow-xs space-y-4">
	<div>
		<h3 class="font-display text-sm font-bold text-[#1C1917]">Analisi & Importazione AI</h3>
		<p class="text-[11px] text-[#78716C] mt-0.5">
			L'analisi parte <strong>automaticamente in tempo reale non appena incollato il testo</strong>.
		</p>
	</div>

	<!-- TAB NAVIGATION: CHATGPT / GEMINI / MOSTRA ENTRAMBI IN SEQUENZA / CONFRONTO -->
	<div class="flex items-center gap-2 border-b border-[#E7DFD5] pb-2 overflow-x-auto">
		<button
			type="button"
			onclick={() => (activeProviderTab = 'chatgpt')}
			class="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0
				{activeProviderTab === 'chatgpt' ? 'bg-purple-900 text-white border-purple-900 shadow-2xs' : 'bg-white text-stone-700 border-[#E7DFD5] hover:bg-[#FAF6F0]'}"
		>
			<Sparkles class="w-3.5 h-3.5 text-purple-300" /> ChatGPT (OpenAI)
			{#if reportChatGPT}
				<span class="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-mono font-bold">
					{reportChatGPT.relations.length}
				</span>
			{/if}
		</button>

		<button
			type="button"
			onclick={() => (activeProviderTab = 'gemini')}
			class="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0
				{activeProviderTab === 'gemini' ? 'bg-blue-900 text-white border-blue-900 shadow-2xs' : 'bg-white text-stone-700 border-[#E7DFD5] hover:bg-[#FAF6F0]'}"
		>
			<Sparkles class="w-3.5 h-3.5 text-blue-300" /> Gemini (Google)
			{#if reportGemini}
				<span class="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-mono font-bold">
					{reportGemini.relations.length}
				</span>
			{/if}
		</button>

		<button
			type="button"
			onclick={() => (activeProviderTab = 'both')}
			class="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0
				{activeProviderTab === 'both' ? 'bg-indigo-900 text-white border-indigo-900 shadow-2xs' : 'bg-white text-stone-700 border-[#E7DFD5] hover:bg-[#FAF6F0]'}"
		>
			<Columns class="w-3.5 h-3.5 text-indigo-300" /> Mostra Entrambi (Uno dopo l'altro)
		</button>

		<button
			type="button"
			onclick={() => (activeProviderTab = 'compare')}
			class="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0
				{activeProviderTab === 'compare' ? 'bg-amber-900 text-white border-amber-900 shadow-2xs' : 'bg-white text-stone-700 border-[#E7DFD5] hover:bg-[#FAF6F0]'}"
		>
			<Layers class="w-3.5 h-3.5 text-amber-300" /> Confronto & Consenso
			{#if consensusAnalysis}
				<span class="px-1.5 py-0.2 rounded-full bg-purple-500 text-white text-[10px] font-mono font-bold">
					✓
				</span>
			{/if}
		</button>
	</div>

	<!-- PANNELLO CHATGPT (SINGOLO) -->
	{#if activeProviderTab === 'chatgpt'}
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<h4 class="text-xs font-bold text-purple-950 flex items-center gap-1.5">
					<Sparkles class="w-4 h-4 text-purple-700" /> Risposta ChatGPT (OpenAI)
				</h4>
				{#if reportChatGPT}
					<Badge variant="green">⚡ Analisi in tempo reale eseguita</Badge>
				{/if}
			</div>

			<TextArea
				value={draftChatGPT}
				oninput={handleChatGPTInput}
				rows={6}
				monospace
				placeholder="Incolla qui la risposta ottenuta da ChatGPT (OpenAI)… L'analisi si avvierà in automatico appena incollata."
			/>

			{#if reportChatGPT && diffChatGPT}
				<div class="p-4 rounded-xl border bg-[#FAF6F0] space-y-3 shadow-2xs border-purple-200 animate-in fade-in">
					<div class="flex items-center justify-between border-b border-[#E7DFD5] pb-2">
						<span class="text-xs font-bold text-purple-950 flex items-center gap-1.5">
							<CheckCircle2 class="w-4 h-4 text-purple-700" /> Brief KPI Summary ChatGPT
						</span>
						<Badge variant="purple">🤖 ChatGPT</Badge>
					</div>

					<div class="grid grid-cols-3 gap-2 text-center text-xs font-bold">
						<div class="p-2 bg-emerald-50 text-emerald-900 rounded border border-emerald-200">
							<span class="block text-sm font-extrabold">{diffChatGPT.added.length}</span>
							<span class="text-[9px]">Nuove Relazioni</span>
						</div>
						<div class="p-2 bg-purple-50 text-purple-900 rounded border border-purple-200">
							<span class="block text-sm font-extrabold">{diffChatGPT.confirmed.length}</span>
							<span class="text-[9px]">Confermate</span>
						</div>
						<div class="p-2 bg-amber-50 text-amber-900 rounded border border-amber-200">
							<span class="block text-sm font-extrabold">{diffChatGPT.removedCandidates.length}</span>
							<span class="text-[9px]">Sparite / Escluse</span>
						</div>
					</div>

					<div class="pt-2 flex flex-col sm:flex-row gap-2">
						<Button variant="ai" full size="sm" onclick={openFullDashboardCompare}>
							<BarChart3 class="w-4 h-4" /> 📊 Apri Finestra Analisi & Approva Risultati
						</Button>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- PANNELLO GEMINI (SINGOLO) -->
	{#if activeProviderTab === 'gemini'}
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<h4 class="text-xs font-bold text-blue-950 flex items-center gap-1.5">
					<Sparkles class="w-4 h-4 text-blue-700" /> Risposta Gemini (Google)
				</h4>
				{#if reportGemini}
					<Badge variant="green">⚡ Analisi in tempo reale eseguita</Badge>
				{/if}
			</div>

			<TextArea
				value={draftGemini}
				oninput={handleGeminiInput}
				rows={6}
				monospace
				placeholder="Incolla qui la risposta ottenuta da Gemini (Google)… L'analisi si avvierà in automatico appena incollata."
			/>

			{#if reportGemini && diffGemini}
				<div class="p-4 rounded-xl border bg-[#FAF6F0] space-y-3 shadow-2xs border-blue-200 animate-in fade-in">
					<div class="flex items-center justify-between border-b border-[#E7DFD5] pb-2">
						<span class="text-xs font-bold text-blue-950 flex items-center gap-1.5">
							<CheckCircle2 class="w-4 h-4 text-blue-700" /> Brief KPI Summary Gemini
						</span>
						<Badge variant="indigo">🤖 Gemini</Badge>
					</div>

					<div class="grid grid-cols-3 gap-2 text-center text-xs font-bold">
						<div class="p-2 bg-emerald-50 text-emerald-900 rounded border border-emerald-200">
							<span class="block text-sm font-extrabold">{diffGemini.added.length}</span>
							<span class="text-[9px]">Nuove Relazioni</span>
						</div>
						<div class="p-2 bg-blue-50 text-blue-900 rounded border border-blue-200">
							<span class="block text-sm font-extrabold">{diffGemini.confirmed.length}</span>
							<span class="text-[9px]">Confermate</span>
						</div>
						<div class="p-2 bg-amber-50 text-amber-900 rounded border border-amber-200">
							<span class="block text-sm font-extrabold">{diffGemini.removedCandidates.length}</span>
							<span class="text-[9px]">Sparite / Escluse</span>
						</div>
					</div>

					<div class="pt-2 flex flex-col sm:flex-row gap-2">
						<Button variant="ai" full size="sm" onclick={openFullDashboardCompare}>
							<BarChart3 class="w-4 h-4" /> 📊 Apri Finestra Analisi & Approva Risultati
						</Button>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- MOSTRA ENTRAMBI (UNO DOPO L'ALTRO IN SEQUENZA) -->
	{#if activeProviderTab === 'both'}
		<div class="space-y-6 animate-in fade-in">
			<!-- BLOCCO CHATGPT -->
			<div class="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3">
				<div class="flex items-center justify-between">
					<h4 class="text-xs font-bold text-purple-950 flex items-center gap-1.5">
						<Sparkles class="w-4 h-4 text-purple-700" /> 1. Risposta ChatGPT (OpenAI)
					</h4>
					{#if reportChatGPT}
						<Badge variant="green">⚡ Analisi Eseguita</Badge>
					{/if}
				</div>

				<TextArea
					value={draftChatGPT}
					oninput={handleChatGPTInput}
					rows={5}
					monospace
					placeholder="Incolla qui la risposta ottenuta da ChatGPT (OpenAI)…"
				/>

				{#if reportChatGPT && diffChatGPT}
					<div class="p-3 bg-white rounded-xl border border-purple-200 space-y-2">
						<span class="text-xs font-bold text-purple-950 block">Brief KPI ChatGPT:</span>
						<div class="grid grid-cols-3 gap-2 text-center text-xs font-bold">
							<div class="p-1.5 bg-emerald-50 text-emerald-900 rounded border border-emerald-200">
								<span class="block text-xs font-extrabold">{diffChatGPT.added.length} nuove</span>
							</div>
							<div class="p-1.5 bg-purple-50 text-purple-900 rounded border border-purple-200">
								<span class="block text-xs font-extrabold">{diffChatGPT.confirmed.length} confermate</span>
							</div>
							<div class="p-1.5 bg-amber-50 text-amber-900 rounded border border-amber-200">
								<span class="block text-xs font-extrabold">{diffChatGPT.removedCandidates.length} escluse</span>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- BLOCCO GEMINI -->
			<div class="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
				<div class="flex items-center justify-between">
					<h4 class="text-xs font-bold text-blue-950 flex items-center gap-1.5">
						<Sparkles class="w-4 h-4 text-blue-700" /> 2. Risposta Gemini (Google)
					</h4>
					{#if reportGemini}
						<Badge variant="green">⚡ Analisi Eseguita</Badge>
					{/if}
				</div>

				<TextArea
					value={draftGemini}
					oninput={handleGeminiInput}
					rows={5}
					monospace
					placeholder="Incolla qui la risposta ottenuta da Gemini (Google)…"
				/>

				{#if reportGemini && diffGemini}
					<div class="p-3 bg-white rounded-xl border border-blue-200 space-y-2">
						<span class="text-xs font-bold text-blue-950 block">Brief KPI Gemini:</span>
						<div class="grid grid-cols-3 gap-2 text-center text-xs font-bold">
							<div class="p-1.5 bg-emerald-50 text-emerald-900 rounded border border-emerald-200">
								<span class="block text-xs font-extrabold">{diffGemini.added.length} nuove</span>
							</div>
							<div class="p-1.5 bg-blue-50 text-blue-900 rounded border border-blue-200">
								<span class="block text-xs font-extrabold">{diffGemini.confirmed.length} confermate</span>
							</div>
							<div class="p-1.5 bg-amber-50 text-amber-900 rounded border border-amber-200">
								<span class="block text-xs font-extrabold">{diffGemini.removedCandidates.length} escluse</span>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<div class="pt-2">
				<Button variant="ai" full size="sm" onclick={openFullDashboardCompare}>
					<BarChart3 class="w-4 h-4" /> 📊 Apri Finestra Analisi & Approva Risultati
				</Button>
			</div>
		</div>
	{/if}

	<!-- PANNELLO TAB CONFRONTO -->
	{#if activeProviderTab === 'compare'}
		<div class="space-y-4">
			{#if !reportChatGPT && !reportGemini}
				<div class="p-6 bg-[#FAF6F0] rounded-xl border border-[#E7DFD5] text-center space-y-2">
					<HelpCircle class="w-6 h-6 text-amber-700 mx-auto" />
					<p class="text-xs font-bold text-[#1C1917]">Nessuna risposta incollata al momento</p>
					<p class="text-[11px] text-[#78716C]">
						Incolla la risposta nei pannelli di ChatGPT o Gemini per attivare il confronto.
					</p>
				</div>
			{:else}
				<div class="p-4 rounded-xl border bg-purple-50/50 border-purple-300 space-y-4 animate-in fade-in">
					<div class="flex items-center justify-between border-b border-purple-200 pb-2">
						<span class="text-xs font-bold text-purple-950 flex items-center gap-1.5 font-display">
							<Layers class="w-4 h-4 text-purple-800" /> Confronto & Consenso Multi-Modello
						</span>
						<Badge variant="purple">Multi-Modello</Badge>
					</div>

					<div class="grid grid-cols-3 gap-2 text-center text-xs font-bold">
						<div class="p-2.5 bg-emerald-100 text-emerald-950 rounded-lg border border-emerald-300">
							<span class="block text-base font-extrabold">{consensusAnalysis?.agreed.length || 0}</span>
							<span class="text-[10px]">In Comune (Concordanti)</span>
						</div>
						<div class="p-2.5 bg-purple-100 text-purple-950 rounded-lg border border-purple-300">
							<span class="block text-base font-extrabold">{consensusAnalysis?.onlyChatGPT.length || 0}</span>
							<span class="text-[10px]">Solo ChatGPT</span>
						</div>
						<div class="p-2.5 bg-blue-100 text-blue-950 rounded-lg border border-blue-300">
							<span class="block text-base font-extrabold">{consensusAnalysis?.onlyGemini.length || 0}</span>
							<span class="text-[10px]">Solo Gemini</span>
						</div>
					</div>

					<div class="pt-2">
						<Button variant="ai" full size="sm" onclick={openFullDashboardCompare}>
							<BarChart3 class="w-4 h-4" /> 📊 Apri Finestra Analisi & Approva Risultati
						</Button>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	{#if warning}
		<Alert tone="warning" message={warning} />
	{:else if batch.status === 'imported'}
		<Alert
			tone="success"
			message="Batch importato con {batch.provider || 'AI'}: {batch.relations.length} relazioni salvate e registrate nello storico."
		/>
	{/if}
</div>
