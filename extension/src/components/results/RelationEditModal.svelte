<script lang="ts">
	import type { ExtractedRelation } from '../../domain/workset';
	import type { LegalArticle } from '../../domain/article';
	import { FileText, X, ChevronUp, ChevronDown } from 'lucide-svelte';
	import { getRelationLinkStatus } from '../../utils/relationUtils';

	export interface EditableRelationDraft extends ExtractedRelation {
		source_act_type?: string;
		source_act_number?: string;
		source_act_year?: string;
		source_act_article?: string;
		source_act_comma?: string;
	}

	interface Props {
		editingDraft: EditableRelationDraft | null;
		editingArticleTitle?: string;
		editingArticleText?: string;
		allLocalWorksets?: Array<{ jobId: string; jobTitle: string }>;
		articles?: LegalArticle[];
		currentJobTitle?: string;
		expandedArticles?: Record<string, boolean>;
		onSave: () => void;
		onCancel: () => void;
		onToggleArticleText: (key: string) => void;
	}

	let {
		editingDraft = $bindable(null),
		editingArticleTitle = '',
		editingArticleText = '',
		allLocalWorksets = [],
		articles = [],
		currentJobTitle = '',
		expandedArticles = {},
		onSave,
		onCancel,
		onToggleArticleText
	}: Props = $props();

	// Mappa tipi famiglia a tipi specifici completi
	const SPECIFIC_TYPES: Record<string, string[]> = {
		REFERENCE: ['DIRECT', 'INDIRECT', 'GENERIC', 'DIRECT_REFERENCE', 'INDIRECT_REFERENCE', 'GENERIC_REFERENCE'],
		AMENDMENT: [
			'ABROGATION',
			'REPEAL',
			'MODIFICATION',
			'SUBSTITUTION',
			'REPLACEMENT',
			'INTEGRATION',
			'INSERTION',
			'PARTIAL_REPEAL',
			'SUSPENSION',
			'SOSPENSION',
			'PROROGATION',
			'AUTHENTIC_INTERPRETATION',
			'GENERIC'
		],
		APPLICATION: ['DIRECT', 'INDIRECT', 'APPLICATION_SCOPE', 'EXECUTION_DECREE', 'IMPLEMENTATION_DEROGATION', 'COMPATIBLE', 'GENERIC'],
		PRECEDENCE: ['DEROGATION', 'EXCEPTION', 'SPECIAL_LAW_PRECEDENCE', 'PRINCIPLE_HIERARCHY', 'GENERIC'],
		CONDITION: ['SUSPENSIVE', 'RESOLUTIVE', 'GENERIC']
	};

	let availableSpecificTypes = $derived.by(() => {
		const family = editingDraft?.family?.toUpperCase() || 'AMENDMENT';
		const types = SPECIFIC_TYPES[family] ? [...SPECIFIC_TYPES[family]] : ['GENERIC'];
		if (editingDraft?.relation_type && !types.includes(editingDraft.relation_type)) {
			types.unshift(editingDraft.relation_type);
		}
		return types;
	});
</script>

{#if editingDraft}
	<div class="fixed inset-0 bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in font-sans">
		<div class="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
			<!-- HEADER MODALE -->
			<div class="flex items-center justify-between px-6 py-5 border-b border-stone-100">
				<h3 class="text-xl font-bold text-[#1C1917] flex items-center gap-3">
					<span class="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-lg">🖊️</span>
					Modifica Relazione Normativa
				</h3>
				<button
					type="button"
					onclick={onCancel}
					class="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- CORPO SCROLLABILE -->
			<div class="overflow-y-auto flex-1 p-6 space-y-5">
				<!-- TESTO COMPLETO SCARICATO & EVIDENZA TESTUALE (IN CIMA) -->
				<div class="space-y-4">
					<!-- 1. TESTO INTEGRALE SCARICATO -->
					{#if editingArticleText}
						<div class="border border-[#E7DFD5] bg-[#FAF6F0] rounded-xl overflow-hidden shadow-xs">
							<div class="px-4 py-2.5 bg-[#FAF6F0] border-b border-[#E7DFD5] flex items-center justify-between">
								<span class="text-xs font-bold text-[#78716C] uppercase tracking-wider flex items-center gap-1.5 font-mono">
									<FileText class="w-4 h-4 text-[#7A2222]" /> Testo Completo Articolo / Disposizione di Riferimento
								</span>
							</div>
							<div class="p-4 space-y-3">
								<!-- Titolo (se disponibile) -->
								{#if editingArticleTitle}
									<div class="p-3 bg-[#FAF6F0] border border-[#E7DFD5] rounded-xl flex items-center gap-2">
										<span class="text-base flex-shrink-0">📄</span>
										<span class="font-bold text-xs text-[#7A2222] leading-snug">
											{editingArticleTitle}
										</span>
									</div>
								{/if}

								<!-- Testo completo -->
								<div class="bg-white p-3.5 border border-[#E7DFD5] rounded-xl">
									<p class="text-xs text-[#1C1917] leading-relaxed font-serif whitespace-pre-wrap">
										{expandedArticles['modal_source_text']
											? editingArticleText
											: editingArticleText.length <= 300
												? editingArticleText
												: `${editingArticleText.slice(0, 300)}…`}
									</p>
									{#if editingArticleText.length > 300}
										<button
											type="button"
											onclick={() => onToggleArticleText('modal_source_text')}
											class="text-xs font-bold text-[#7A2222] hover:underline cursor-pointer flex items-center gap-1 mt-2"
										>
											{#if expandedArticles['modal_source_text']}
												<ChevronUp class="w-3.5 h-3.5" /> Riduci testo completo
											{:else}
												<ChevronDown class="w-3.5 h-3.5" /> Mostra tutto il testo ({editingArticleText.length} caratteri)
											{/if}
										</button>
									{/if}
								</div>
							</div>
						</div>
					{/if}

					<!-- 2. EVIDENZA TESTUALE (FRAMMENTO DI ATTO) -->
					<div class="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
						<div class="px-4 py-2.5 bg-stone-50 border-b border-stone-100 flex items-center gap-2">
							<span class="text-stone-500 text-base">💬</span>
							<span class="text-xs font-bold uppercase tracking-wider text-stone-600">Evidenza Testuale (Frammento di testo modificante)</span>
						</div>
						<div class="p-4 space-y-2">
							<div class="relative">
								<span class="absolute left-3 top-3 text-stone-300 text-lg leading-none select-none">"</span>
								<textarea
									bind:value={editingDraft.evidence}
									rows="3"
									maxlength="500"
									class="w-full pl-7 pr-3 py-3 text-xs font-serif italic text-stone-700 border border-stone-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors resize-none"
									placeholder="Inserisci il frammento di testo che giustifica il tipo di relazione selezionato..."
								></textarea>
								<span class="absolute bottom-3 right-3 text-[10px] text-stone-400 font-mono">
									{(editingDraft.evidence || '').length} / 500
								</span>
							</div>
							<p class="text-[10px] text-stone-400">Trascrizione del frammento di articolo che contiene il rinvio o la disposizione.</p>
						</div>
					</div>
				</div>

				<!-- GRIGLIA ATTO SORGENTE / ATTO TARGET -->
				<div class="grid grid-cols-2 gap-4">
					<!-- ATTO SORGENTE -->
					<div class="border border-stone-200 rounded-xl overflow-hidden">
						<div class="px-4 py-3 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
							<span class="text-purple-700 text-base">🏛️</span>
							<span class="text-xs font-extrabold uppercase tracking-widest text-purple-800">Atto Sorgente (Chi Modifica)</span>
						</div>
						<div class="p-4 space-y-3">
							<!-- Tipo atto + Numero + Anno in riga -->
							<div class="grid grid-cols-[1fr_80px_70px] gap-2">
								<div class="space-y-1">
									<label class="block text-xs font-semibold text-stone-600">Tipo atto</label>
									<div class="flex items-center gap-2 border border-stone-200 rounded-lg px-2.5 py-2 bg-white focus-within:border-purple-500 transition-colors">
										<span class="text-stone-400 text-sm flex-shrink-0">🏛️</span>
										<input
											type="text"
											bind:value={editingDraft.source_act_type}
											class="flex-1 text-xs font-mono font-bold text-stone-800 focus:outline-none min-w-0 bg-transparent"
											placeholder="REGIO_DECRETO_LEGGE"
										/>
									</div>
								</div>
								<div class="space-y-1">
									<label class="block text-xs font-semibold text-stone-600">Numero</label>
									<input
										type="text"
										bind:value={editingDraft.source_act_number}
										class="w-full text-xs font-mono font-bold text-stone-800 border border-stone-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-purple-500 transition-colors"
										placeholder="25"
									/>
								</div>
								<div class="space-y-1">
									<label class="block text-xs font-semibold text-stone-600">Anno</label>
									<input
										type="text"
										bind:value={editingDraft.source_act_year}
										class="w-full text-xs font-mono font-bold text-stone-800 border border-stone-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-purple-500 transition-colors"
										placeholder="1944"
									/>
								</div>
							</div>

							<!-- Articolo + Comma sorgente in riga -->
							<div class="grid grid-cols-2 gap-2">
								<div class="space-y-1">
									<label class="block text-xs font-semibold text-stone-600">Articolo / Disposizione</label>
									<div class="flex items-center gap-2 border border-stone-200 rounded-lg px-2.5 py-2 bg-white focus-within:border-purple-500 transition-colors">
										<span class="text-stone-400 text-sm flex-shrink-0">📖</span>
										<input
											type="text"
											bind:value={editingDraft.source_act_article}
											class="flex-1 text-xs font-mono text-stone-800 focus:outline-none min-w-0 bg-transparent"
											placeholder="Art. 1"
										/>
									</div>
									<p class="text-[10px] text-stone-400">Articolo dell'atto sorgente.</p>
								</div>
								<div class="space-y-1">
									<label class="block text-xs font-semibold text-stone-600">Comma / Paragrafo</label>
									<input
										type="text"
										bind:value={editingDraft.source_act_comma}
										class="w-full text-xs font-mono text-stone-800 border border-stone-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-purple-500 transition-colors"
										placeholder="es: 1"
									/>
									<p class="text-[10px] text-stone-400">Comma o paragrafo specifico.</p>
								</div>
							</div>

							<!-- Badge stato link sorgente -->
							<div class="p-2 text-[10px] font-semibold rounded-lg border leading-relaxed mt-2 text-center
								{getRelationLinkStatus(editingDraft, true, allLocalWorksets, articles, currentJobTitle).type === 'broken'
									? 'bg-amber-50 text-amber-800 border-amber-200'
									: 'bg-emerald-50 text-emerald-800 border-emerald-200'}">
								{getRelationLinkStatus(editingDraft, true, allLocalWorksets, articles, currentJobTitle).label}
							</div>
						</div>
					</div>

					<!-- ATTO TARGET -->
					<div class="border border-stone-200 rounded-xl overflow-hidden">
						<div class="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
							<span class="text-emerald-700 text-base">🎯</span>
							<span class="text-xs font-extrabold uppercase tracking-widest text-emerald-800">Atto Target (Abrogato/Rinviato)</span>
						</div>
						<div class="p-4 space-y-3">
							<!-- Indicatore Atto Target esplicito IN CIMA -->
							<div class="p-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-lg text-[10px] space-y-0.5">
								<span class="font-extrabold text-emerald-950 block uppercase tracking-wider text-[9px]">Atto Target di Destinazione:</span>
								<span class="text-stone-900 font-bold block font-mono text-xs truncate">
									{editingDraft.source_article
										? `🏛️ ${editingDraft.source_article}`
										: currentJobTitle
										? `🏛️ ${currentJobTitle} (Atto Principale)`
										: '🏛️ Atto Principale in lavorazione'}
								</span>
							</div>

							<!-- Articolo target -->
							<div class="space-y-1">
								<label class="block text-xs font-semibold text-stone-600">Articolo target (da abrogare/rinviare)</label>
								<input
									type="text"
									bind:value={editingDraft.target_article}
									class="w-full text-xs font-mono font-bold text-stone-800 border border-stone-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
									placeholder="Art. 1"
								/>
								<p class="text-[10px] text-stone-400">Articolo del testo di destinazione.</p>
							</div>

							<!-- Comma + Codice in riga -->
							<div class="grid grid-cols-2 gap-2">
								<div class="space-y-1">
									<label class="block text-xs font-semibold text-stone-600">Comma / Paragrafo target</label>
									<input
										type="text"
										bind:value={editingDraft.target_paragraph}
										class="w-full text-xs font-mono text-stone-800 border border-stone-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
										placeholder="1"
									/>
									<p class="text-[10px] text-stone-400">Comma, paragrafo o voce specifica.</p>
								</div>
								<div class="space-y-1">
									<label class="block text-xs font-semibold text-stone-600">Codice / Atto diverso (se applicabile)</label>
									<input
										type="text"
										bind:value={editingDraft.source_article}
										class="w-full text-xs font-mono text-stone-800 border border-stone-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
										placeholder="es: Codice Civile"
									/>
									<p class="text-[10px] text-stone-400">Lasciare vuoto se è l'atto in lavorazione.</p>
								</div>
							</div>

							<!-- Badge stato target -->
							<div class="p-2 text-[10px] font-semibold rounded-lg border leading-relaxed mt-2 text-center
								{getRelationLinkStatus(editingDraft, false, allLocalWorksets, articles, currentJobTitle).type === 'broken'
									? 'bg-amber-50 text-amber-800 border-amber-200'
									: 'bg-emerald-50 text-emerald-800 border-emerald-200'}">
								{getRelationLinkStatus(editingDraft, false, allLocalWorksets, articles, currentJobTitle).label}
							</div>
						</div>
					</div>
				</div>

				<!-- DETTAGLI DELLA RELAZIONE -->
				<div class="border border-rose-200 rounded-xl overflow-hidden">
					<div class="px-4 py-3 bg-rose-50 border-b border-rose-100 flex items-center gap-2">
						<span class="text-rose-600 text-base">🔗</span>
						<span class="text-xs font-extrabold uppercase tracking-widest text-rose-700">Dettagli della Relazione</span>
					</div>
					<div class="p-4">
						<div class="grid grid-cols-2 gap-4">
							<!-- Famiglia relazione -->
							<div class="space-y-1.5">
								<label class="block text-xs font-semibold text-stone-600">Famiglia relazione</label>
								<div class="relative">
									<select
										bind:value={editingDraft.family}
										class="w-full text-xs font-bold text-stone-800 border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-purple-500 transition-colors appearance-none cursor-pointer"
									>
										<option value="AMENDMENT">AMENDMENT (Modifica)</option>
										<option value="REFERENCE">REFERENCE (Riferimento)</option>
										<option value="APPLICATION">APPLICATION (Applicazione)</option>
										<option value="PRECEDENCE">PRECEDENCE (Precedenza)</option>
										<option value="CONDITION">CONDITION (Condizione)</option>
									</select>
									<span class="absolute right-3 top-2.5 text-stone-400 pointer-events-none text-xs">▼</span>
								</div>
							</div>

							<!-- Tipo relazione specifico (dinamico in base alla famiglia) -->
							<div class="space-y-1.5">
								<label class="block text-xs font-semibold text-stone-600">Tipo relazione (specifico)</label>
								<div class="relative">
									<select
										bind:value={editingDraft.relation_type}
										class="w-full text-xs font-mono text-stone-800 border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-purple-500 transition-colors appearance-none cursor-pointer"
									>
										{#each availableSpecificTypes as type}
											<option value={type}>{type}</option>
										{/each}
									</select>
									<span class="absolute right-3 top-2.5 text-stone-400 pointer-events-none text-xs">▼</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- FOOTER CON PULSANTI AZIONE -->
			<div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-100 bg-stone-50/50 rounded-b-2xl">
				<button
					type="button"
					onclick={onCancel}
					class="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 transition-colors cursor-pointer"
				>
					Annulla
				</button>
				<button
					type="button"
					onclick={onSave}
					class="px-5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
				>
					<span>💾</span> Salva Modifiche
				</button>
			</div>
		</div>
	</div>
{/if}
