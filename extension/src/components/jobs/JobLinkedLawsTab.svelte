<script lang="ts">
	import {
		ShieldAlert,
		LayoutGrid,
		List,
		AlertTriangle,
		CheckCircle2
	} from 'lucide-svelte';
	import type { Workset } from '@/domain/workset';
	import { jobsStore } from '@/stores/jobs.svelte';
	import { router } from '@/router.svelte';
	import LinkedLawsFilter from './LinkedLawsFilter.svelte';
	import LinkedLawCard, { type LinkedLaw } from './LinkedLawCard.svelte';

	interface Props {
		workset: Workset | null;
	}

	let { workset }: Props = $props();

	let filterCategory = $state<'all' | 'repeal' | 'broken' | 'partial_broken' | 'active'>('all');
	let viewMode = $state<'grid' | 'detailed'>('grid');
	let expandedArtMap = $state<Record<string, boolean>>({});
	let proposingLawId = $state<string | null>(null);
	let successProposedMsg = $state<string | null>(null);

	let articles = $derived(workset?.articles || []);
	let approvedBatches = $derived((workset?.batches || []).filter((b) => b.status === 'imported'));
	let approvedRelations = $derived(approvedBatches.flatMap((b) => b.relations || []));

	// Consolidate linked laws list with status analysis (broken, partial broken, repeal, active)
	let linkedLawsList = $derived.by(() => {
		const map = new Map<string, LinkedLaw>();

		function getLawKey(title: string) {
			return title.trim().toLowerCase().replace(/\s+/g, ' ');
		}

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

			const isBroken = Boolean(isRepeal || !articles.some((a) => target.includes(a.numero)));
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

	async function handleProposeTaskForLaw(law: LinkedLaw) {
		proposingLawId = law.id;
		successProposedMsg = null;
		try {
			const job = await jobsStore.proposeTask(law.title, law.targetArticle);
			if (job) {
				successProposedMsg = `Task '${job.title}' registrato con successo nel DB backend! Apri l'attività per avviarne lo scaricamento.`;
				router.toJob(job.id);
			}
		} finally {
			proposingLawId = null;
		}
	}

	function toggleExpand(key: string) {
		expandedArtMap[key] = !expandedArtMap[key];
	}
</script>

<div class="space-y-4 py-2">
	{#if successProposedMsg}
		<div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between gap-3 animate-in fade-in shadow-2xs">
			<div class="flex items-center gap-2 text-xs font-bold">
				<CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
				<span>{successProposedMsg}</span>
			</div>
		</div>
	{/if}

	<!-- AUDIT ALERT PER BROKEN LINKS / ABROGAZIONI MISMATCH -->
	{#if brokenCount > 0 || repealingCount > 0}
		<div class="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1.5 shadow-2xs">
			<div class="flex items-start gap-2 font-bold text-xs text-amber-900">
				<AlertTriangle class="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
				<span>Audit Connessioni Normative: Rilevati Broken Links e Clausole Abrogative</span>
			</div>
			<p class="text-[11px] text-amber-800 leading-relaxed font-serif pl-6">
				L'estrazione ha individuato <strong>{brokenCount} rinvii a fonti non presenti in memoria (Broken Links)</strong> e <strong>{repealingCount} atti abroganti</strong>. Utilizza i filtri sottostanti per esaminare o creare il task sul backend per qualsiasi fonte.
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
					Quadro analitico delle fonti esterne. Puoi proporre e registrare un nuovo task al backend per qualsiasi fonte.
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
		<LinkedLawsFilter
			{filterCategory}
			totalCount={linkedLawsList.length}
			{brokenCount}
			{repealingCount}
			{partialBrokenCount}
			{activeCount}
			onSelectCategory={(cat) => (filterCategory = cat)}
		/>
	</div>

	<!-- ELENCO DELLE LEGGI CONNESSE (VISTA GRIGLIA O DETTAGLIATA) -->
	{#if filteredLaws.length === 0}
		<div class="p-8 text-center text-xs text-[#78716C] bg-[#FAF6F0] rounded-2xl border border-[#E7DFD5] italic">
			Nessuna fonte esterna o legge connessa corrispondente al filtro selezionato.
		</div>
	{:else}
		<div class="space-y-4">
			{#each filteredLaws as law (law.id)}
				<LinkedLawCard
					{law}
					{viewMode}
					{expandedArtMap}
					{proposingLawId}
					onProposeTask={handleProposeTaskForLaw}
					onToggleExpand={toggleExpand}
				/>
			{/each}
		</div>
	{/if}
</div>
