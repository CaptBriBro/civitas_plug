<script lang="ts">
	import {
		BarChart3,
		BookOpen,
		Sparkles,
		AlertTriangle,
		Link2,
		CheckCircle2,
		FileText,
		RefreshCw,
		RotateCcw,
		Trash2
	} from 'lucide-svelte';
	import Button from '@/components/ui/Button.svelte';
	import type { Workset } from '@/domain/workset';
	import { worksetStore } from '@/stores/workset.svelte';

	interface Props {
		workset: Workset | null;
		downloading: boolean;
		onselecttab?: (tab: string) => void;
		onstartai?: () => void;
	}

	let { workset, downloading, onselecttab, onstartai }: Props = $props();

	let showResetConfirm = $state(false);
	let resetting = $state(false);

	let articles = $derived(workset?.articles || []);
	let totalArticlesCount = $derived(articles.length);
	let isCompleted = $derived((workset?.articles.length || 0) > 0 && !downloading);

	// Collect candidates and relations
	let allCandidates = $derived(
		articles.flatMap((a) =>
			(a.candidates || []).map((c) => ({
				...c,
				sourceArticle: a.numero,
				label: c.label || 'Rinvio normativo'
			}))
		)
	);

	let allRelations = $derived(
		(workset?.batches || []).flatMap((b) => b.relations || [])
	);

	let totalReferencesCount = $derived(allCandidates.length + allRelations.length);

	let abrogationCount = $derived(
		allCandidates.filter(
			(c) =>
				c.label.toLowerCase().includes('abrogaz') ||
				(c.type === 'law_reference' && c.text.toLowerCase().includes('abrogat'))
		).length +
			allRelations.filter(
				(r) =>
					r.family === 'AMENDMENT' ||
					r.relation_type === 'ABROGATION' ||
					r.relation_type === 'REPEAL' ||
					(r.evidence && r.evidence.toLowerCase().includes('abrogat'))
			).length
	);

	let referenceCount = $derived(
		allCandidates.filter(
			(c) =>
				c.type === 'generic_normative_reference' ||
				c.type === 'article_reference' ||
				c.type === 'paragraph_reference'
		).length +
			allRelations.filter(
				(r) => r.family === 'REFERENCE' || r.relation_type === 'GENERIC'
			).length
	);

	let precedenceCount = $derived(
		allCandidates.filter((c) => c.label.toLowerCase().includes('deroga') || c.label.toLowerCase().includes('precedenz')).length +
			allRelations.filter(
				(r) => r.family === 'PRECEDENCE' || r.relation_type === 'DEROGATION' || r.relation_type === 'EXCEPTION'
			).length
	);

	let applicationCount = $derived(
		allCandidates.filter((c) => c.label.toLowerCase().includes('applicaz')).length +
			allRelations.filter(
				(r) => r.family === 'APPLICATION' || r.relation_type === 'DIRECT' || r.relation_type === 'COMPATIBLE'
			).length
	);

	let amendmentCount = $derived(
		allCandidates.filter((c) => c.label.toLowerCase().includes('modifica') || c.label.toLowerCase().includes('sostituz')).length +
			allRelations.filter(
				(r) => (r.family === 'AMENDMENT' && r.relation_type !== 'ABROGATION') || r.relation_type === 'REPLACEMENT' || r.relation_type === 'MODIFICATION'
			).length
	);

	// Version count across articles
	let versionsCount = $derived(
		articles.reduce((acc, a) => acc + ((a.versions || []).filter((v) => !v.isCurrent).length), 0)
	);

	// External linked laws
	let linkedLawsMap = $derived.by(() => {
		const map = new Map<string, { title: string; urn: string | null; count: number }>();
		for (const c of allCandidates) {
			if (c.type === 'law_reference' || c.type === 'decree_reference' || c.type === 'code_reference') {
				const key = c.parsed?.lawNumber
					? `${c.parsed.lawType || 'Legge'} n. ${c.parsed.lawNumber}`
					: c.text.slice(0, 50);
				const existing = map.get(key);
				if (existing) {
					existing.count++;
				} else {
					map.set(key, { title: key, urn: null, count: 1 });
				}
			}
		}
		return Array.from(map.values());
	});

	let isLlmVerified = $derived(
		(workset?.batches || []).some((b) => b.status === 'imported' && (b.relations || []).length > 0)
	);

	async function handleConfirmReset() {
		if (!workset?.jobId) return;
		resetting = true;
		try {
			await worksetStore.resetWorkset(workset.jobId);
			showResetConfirm = false;
		} finally {
			resetting = false;
		}
	}
</script>

<div class="space-y-5 py-2">
	<!-- Top Banner - Phase 1 Report Overview -->
	<div class="bg-gradient-to-r from-[#FAF6F0] via-stone-50 to-[#F5EBE6] p-5 rounded-2xl border border-[#E7DFD5] shadow-2xs">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
			<div>
				<div class="flex items-center gap-2">
					{#if downloading}
						<span class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-amber-600 text-white flex items-center gap-1.5 animate-pulse">
							<RefreshCw class="w-3 h-3 animate-spin text-amber-200" /> Scaricamento in Corso ({totalArticlesCount} articoli letti)
						</span>
					{:else if isCompleted}
						<span class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-[#7A2222] text-white">
							Fase 1: Parsing Euristico Completato
						</span>
					{:else}
						<span class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-[#78716C] text-white">
							Attività in Attesa di Avvio
						</span>
					{/if}

					{#if isLlmVerified}
						<span class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-emerald-800 text-white flex items-center gap-1">
							<Sparkles class="w-3 h-3 text-emerald-300" /> Categorizzato con AI
						</span>
					{/if}
				</div>
				<h3 class="text-base font-bold text-[#1C1917] font-display mt-2 flex items-center gap-2">
					<BarChart3 class="w-5 h-5 text-[#7A2222]" /> Report Sintetico Acquisizione Normativa
				</h3>
				<p class="text-xs text-[#57534E] mt-0.5">
					Risultato dell'estrazione testuale e stima preliminare delle relazioni e dei riferimenti legali.
				</p>
			</div>

			<div class="flex items-center gap-2 flex-wrap shrink-0">
				{#if onstartai && isCompleted}
					<button
						onclick={onstartai}
						class="bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-900 hover:to-indigo-900 text-white shadow-xs px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 shrink-0 border border-purple-600/40 cursor-pointer active:scale-95 transition-all"
					>
						<span class="text-base">🤖</span>
						<span>Categorizza con AI</span>
					</button>
				{/if}

				<!-- PULSANTE PER RESETTARE COMPLETAMENTE IL TASK -->
				<button
					type="button"
					onclick={() => (showResetConfirm = true)}
					class="px-3.5 py-2.5 bg-rose-50 text-rose-950 border border-rose-300 hover:bg-rose-100 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
					title="Cancella gli articoli scaricati ed i batch per ripartire da zero"
				>
					<RotateCcw class="w-4 h-4 text-rose-700" />
					<span>Resetta Completamente Task</span>
				</button>
			</div>
		</div>

		<!-- MODALE DI CONFERMA RESET TASK -->
		{#if showResetConfirm}
			<div class="p-4 rounded-xl bg-rose-50 border border-rose-300 space-y-3 mb-4 animate-in fade-in">
				<div class="flex items-start gap-2 text-rose-950 font-bold text-xs">
					<AlertTriangle class="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
					<div>
						<h4 class="font-display font-bold text-sm text-rose-950">Sei sicuro di voler resettare questo task?</h4>
						<p class="text-xs text-rose-900 font-serif font-normal mt-1 leading-relaxed">
							Questa operazione cancellerà tutti gli articoli scaricati finora, i candidati ed i batch di analisi AI. Potrai riscaricare il testo ed avviare l'analisi da zero.
						</p>
					</div>
				</div>
				<div class="flex items-center justify-end gap-2 pt-2 border-t border-rose-200">
					<Button size="sm" variant="outline" onclick={() => (showResetConfirm = false)} disabled={resetting}>
						Annulla
					</Button>
					<Button size="sm" variant="danger" onclick={handleConfirmReset} disabled={resetting}>
						{#if resetting}
							<RefreshCw class="w-3.5 h-3.5 animate-spin" /> Azzeramento in corso…
						{:else}
							<Trash2 class="w-3.5 h-3.5" /> Conferma Reset Task
						{/if}
					</Button>
				</div>
			</div>
		{/if}

		{#if totalArticlesCount === 0 && !downloading}
			<div class="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 font-medium flex items-center gap-2 shadow-2xs">
				<AlertTriangle class="w-4 h-4 text-amber-800 shrink-0" />
				<span>Nessun articolo o dato estratto finora. Fai clic su <strong>«Scarica articoli»</strong> per acquisire gli articoli ed elaborare il report analitico.</span>
			</div>
		{/if}

		<!-- Key Metrics Cards Grid (6 Columns) -->
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
			<div class="bg-white p-3.5 rounded-xl border border-[#E7DFD5] shadow-2xs">
				<div class="flex items-center gap-2 text-stone-500 mb-1">
					<BookOpen class="w-4 h-4 text-[#7A2222]" />
					<span class="text-[11px] font-bold">Articoli Estratti</span>
				</div>
				<div class="text-xl font-bold font-mono text-[#1C1917]">{totalArticlesCount}</div>
				<div class="text-[10px] text-stone-500 mt-0.5">Disposizioni lette</div>
			</div>

			<div class="bg-white p-3.5 rounded-xl border border-[#E7DFD5] shadow-2xs">
				<div class="flex items-center gap-2 text-stone-500 mb-1">
					<Sparkles class="w-4 h-4 text-sky-700" />
					<span class="text-[11px] font-bold">Riferimenti Rilevati</span>
				</div>
				<div class="text-xl font-bold font-mono text-[#1C1917]">{totalReferencesCount}</div>
				<div class="text-[10px] text-stone-500 mt-0.5">Stima euristica iniziale</div>
			</div>

			<div class="bg-white p-3.5 rounded-xl border border-[#E7DFD5] shadow-2xs">
				<div class="flex items-center gap-2 text-stone-500 mb-1">
					<Link2 class="w-4 h-4 text-rose-700" />
					<span class="text-[11px] font-bold">Abrogazioni Stimate</span>
				</div>
				<div class="text-xl font-bold font-mono text-rose-800">{abrogationCount}</div>
				<div class="text-[10px] text-stone-500 mt-0.5">Clausole o note abrogative</div>
			</div>

			<button
				type="button"
				onclick={() => linkedLawsMap.length > 0 && onselecttab && onselecttab('linked_laws')}
				class="bg-white p-3.5 rounded-xl border border-[#E7DFD5] shadow-2xs text-left w-full {linkedLawsMap.length > 0 ? 'cursor-pointer hover:border-amber-500 hover:bg-amber-50/40 transition-all' : ''}"
			>
				<div class="flex items-center gap-2 text-stone-500 mb-1">
					<AlertTriangle class="w-4 h-4 text-amber-700" />
					<span class="text-[11px] font-bold">Broken Links / Esterni</span>
				</div>
				<div class="text-xl font-bold font-mono text-amber-800">{linkedLawsMap.length}</div>
				<div class="text-[10px] text-stone-500 mt-0.5">{linkedLawsMap.length > 0 ? 'Fai clic per aprire la tab →' : 'Riferimenti non in memoria'}</div>
			</button>

			<button
				type="button"
				onclick={() => onselecttab && onselecttab('normative_references')}
				class="bg-white p-3.5 rounded-xl border border-[#E7DFD5] shadow-2xs text-left w-full cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/40 transition-all"
			>
				<div class="flex items-center gap-2 text-stone-500 mb-1">
					<CheckCircle2 class="w-4 h-4 text-emerald-700" />
					<span class="text-[11px] font-bold">Broken Links Sanati</span>
				</div>
				<div class="text-xl font-bold font-mono text-emerald-800">0</div>
				<div class="text-[10px] text-stone-500 mt-0.5">Riferimenti risolti</div>
			</button>

			<div class="bg-white p-3.5 rounded-xl border border-[#E7DFD5] shadow-2xs">
				<div class="flex items-center gap-2 text-stone-500 mb-1">
					<FileText class="w-4 h-4 text-purple-700" />
					<span class="text-[11px] font-bold">Versioni Storiche</span>
				</div>
				<div class="text-xl font-bold font-mono text-purple-800">{versionsCount}</div>
				<div class="text-[10px] text-stone-500 mt-0.5">Testi storici estratto</div>
			</div>
		</div>
	</div>

	<!-- Category Breakdown & Distribution Card -->
	<div class="bg-white p-4 rounded-xl border border-[#E7DFD5] shadow-2xs">
		<h4 class="text-xs font-bold text-[#7A2222] uppercase tracking-wider mb-3 flex items-center justify-between">
			<span class="flex items-center gap-1.5"><FileText class="w-4 h-4" /> Distribuzione Tipologie Riferimenti</span>
			{#if onselecttab}
				<button onclick={() => onselecttab('normative_references')} class="text-[11px] text-[#7A2222] font-semibold hover:underline cursor-pointer">
					Vedi tutti nella scheda Rinvii →
				</button>
			{/if}
		</h4>

		<div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
			<div class="bg-rose-50/70 p-2.5 rounded-xl border border-rose-200">
				<div class="text-[10px] font-bold text-rose-900 uppercase">Abrogazioni</div>
				<div class="text-lg font-bold font-mono text-rose-950">{abrogationCount}</div>
			</div>

			<div class="bg-sky-50/70 p-2.5 rounded-xl border border-sky-200">
				<div class="text-[10px] font-bold text-sky-900 uppercase">Rinvii Generici</div>
				<div class="text-lg font-bold font-mono text-sky-950">{referenceCount}</div>
			</div>

			<div class="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
				<div class="text-[10px] font-bold text-amber-900 uppercase">Deroghe / Precedenza</div>
				<div class="text-lg font-bold font-mono text-amber-950">{precedenceCount}</div>
			</div>

			<div class="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200">
				<div class="text-[10px] font-bold text-emerald-900 uppercase">Applicazioni</div>
				<div class="text-lg font-bold font-mono text-emerald-950">{applicationCount}</div>
			</div>

			<div class="bg-purple-50/70 p-2.5 rounded-xl border border-purple-200">
				<div class="text-[10px] font-bold text-purple-900 uppercase">Modifiche & Testi</div>
				<div class="text-lg font-bold font-mono text-purple-950">{amendmentCount}</div>
			</div>
		</div>
	</div>

	<!-- Fonti Esterne & Leggi Connesse Rilevate Box -->
	{#if linkedLawsMap.length > 0}
		<div class="bg-white p-4 rounded-xl border border-[#E7DFD5] shadow-2xs space-y-3">
			<div class="flex items-center justify-between">
				<h4 class="text-xs font-bold uppercase tracking-wider text-[#7A2222] font-display flex items-center gap-1.5">
					<Link2 class="w-4 h-4 text-amber-800" /> Fonti Esterne & Leggi Connesse Rilevate ({linkedLawsMap.length})
				</h4>
				{#if onselecttab}
					<button
						onclick={() => onselecttab('linked_laws')}
						class="text-[11px] font-bold text-[#7A2222] hover:underline cursor-pointer"
					>
						Apri scheda Connessioni →
					</button>
				{/if}
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
				{#each linkedLawsMap.slice(0, 6) as law, index (`law_${law.title}_${index}`)}
					<div class="p-3 rounded-xl bg-[#FAF6F0] border border-[#E7DFD5] text-xs space-y-1.5 flex flex-col justify-between">
						<div>
							<div class="font-bold text-[#1C1917] line-clamp-2" title={law.title}>
								{law.title}
							</div>
							<div class="text-[10px] text-stone-500 font-mono mt-0.5">{law.count} citazioni rilevate</div>
						</div>

						<div class="flex items-center justify-between pt-1 border-t border-[#E7DFD5]">
							<span class="px-2 py-0.5 text-[9px] font-bold rounded-md bg-amber-100 text-amber-900 border border-amber-300">
								⚠️ Esterna
							</span>
							{#if onselecttab}
								<button
									onclick={() => onselecttab('linked_laws')}
									class="text-[10px] font-bold text-[#7A2222] hover:underline cursor-pointer"
								>
									Vedi →
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
