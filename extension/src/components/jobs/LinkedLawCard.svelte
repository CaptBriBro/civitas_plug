<script lang="ts">
	import { FileText, ChevronRight, RefreshCw, Play } from 'lucide-svelte';
	import Badge from '@/components/ui/Badge.svelte';
	import Button from '@/components/ui/Button.svelte';

	export interface LinkedLaw {
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

	interface Props {
		law: LinkedLaw;
		viewMode: 'grid' | 'detailed';
		expandedArtMap: Record<string, boolean>;
		proposingLawId: string | null;
		onProposeTask: (law: LinkedLaw) => void;
		onToggleExpand: (key: string) => void;
	}

	let {
		law,
		viewMode,
		expandedArtMap,
		proposingLawId,
		onProposeTask,
		onToggleExpand
	}: Props = $props();
</script>

<div class="p-5 rounded-2xl bg-white border border-[#E7DFD5] shadow-xs space-y-4">
	<!-- Header Scheda Legge con Bottone Proponi / Scarica Task -->
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

		<!-- TASTO CREA / PROPONI TASK AL BACKEND -->
		<div class="shrink-0 self-end sm:self-center">
			<Button
				variant="ai"
				size="sm"
				disabled={proposingLawId === law.id}
				onclick={() => onProposeTask(law)}
			>
				{#if proposingLawId === law.id}
					<RefreshCw class="w-3.5 h-3.5 animate-spin" /> Registrazione Task...
				{:else}
					<Play class="w-3.5 h-3.5" /> ⚡ Scarica Legge / Crea Task Ora
				{/if}
			</Button>
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
							onclick={() => onToggleExpand(expKey)}
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
							onclick={() => onToggleExpand(expKeyDet)}
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
