<script lang="ts">
	import { Settings, ShieldCheck, Link2, LogOut } from 'lucide-svelte';
	import EnvSelector from '@/components/settings/EnvSelector.svelte';
	import Alert from '@/components/ui/Alert.svelte';
	import Button from '@/components/ui/Button.svelte';
	import { settingsStore } from '@/stores/settings.svelte';
	import { authStore } from '@/stores/auth.svelte';
	import { normalizeCode } from '@/features/auth/activationService';
	import { REFERENCE_PARSER_VERSION, getExtensionVersion, getBrowserId } from '@/config/version';

	// Valore locale, non derivato dallo store: uno slider trascinato spara
	// `oninput` in continuo, e se il valore mostrato dipendesse dal giro di
	// andata e ritorno asincrono su `browser.storage`, le risposte fuori
	// ordine farebbero scattare indietro il cursore a metà trascinamento.
	// Si aggiorna subito in locale, si persiste solo al rilascio (`onchange`).
	let threshold = $state(settingsStore.settings.candidateThreshold);
	let batchSize = $state(settingsStore.settings.batchSize);
	let serverMax = $derived(settingsStore.serverConfig?.max_articles_per_batch);

	let code = $state('');
	let linked = $state(false);

	async function handleLink() {
		linked = await authStore.link(code);
		if (linked) code = '';
	}

	$effect(() => {
		if (!settingsStore.loading) {
			threshold = settingsStore.settings.candidateThreshold;
			batchSize = settingsStore.settings.batchSize;
		}
	});
</script>

<div class="max-w-xl space-y-5">
	<div>
		<div class="flex items-center gap-2 text-[#7A2222]">
			<Settings class="w-4 h-4" />
			<span class="text-[10px] font-bold uppercase tracking-widest">Configurazione</span>
		</div>
		<h1 class="font-display text-2xl font-bold text-[#7A2222] mt-1">Impostazioni</h1>
	</div>

	<!-- L'ambiente va scelto prima di collegarsi: il codice vale su un solo server. -->
	<div class="bg-white border border-[#E7DFD5] rounded-2xl p-4 shadow-xs space-y-3">
		<EnvSelector />
		{#if settingsStore.connectionError}
			<Alert tone="error" message={settingsStore.connectionError}>
				<Button size="sm" variant="outline" onclick={() => settingsStore.probeServer()}>
					Riprova
				</Button>
			</Alert>
		{:else if settingsStore.serverConfig}
			<div class="flex items-center justify-between gap-3 flex-wrap">
				<p class="text-[11px] text-emerald-700 font-semibold">
					Server raggiungibile · provider attivi: {settingsStore.serverConfig.providers.join(', ')}
					· batch suggeriti: {settingsStore.serverConfig.max_articles_per_batch} articoli
				</p>
				<Button size="sm" variant="outline" onclick={() => settingsStore.resetToDefaults()}>
					Ripristina i default dal server
				</Button>
			</div>
			<p class="text-[10px] text-[#78716C]">
				Letta una sola volta all'attivazione: resta questa finché non premi il pulsante, anche se il
				server cambia i limiti nel frattempo.
			</p>
		{/if}
	</div>

	<!-- Account Civitas -->
	<div class="bg-white border border-[#E7DFD5] rounded-2xl p-4 shadow-xs space-y-3">
		<div class="flex items-center gap-2 text-[#7A2222]">
			<Link2 class="w-4 h-4" />
			<span class="text-[10px] font-bold uppercase tracking-widest">Account Civitas</span>
		</div>
		<p class="text-xs text-[#78716C]">
			Il collegamento serve solo per sottomettere le proposte. Consultare le attività, scaricare gli
			articoli e preparare le analisi funziona anche senza.
		</p>

		{#if authStore.isLinked && authStore.auth}
			<div class="border-t border-[#E7DFD5] pt-3 space-y-3">
				<div class="flex items-center gap-2 text-emerald-700">
					<ShieldCheck class="w-4 h-4" />
					<span class="text-xs font-bold uppercase tracking-wider">Collegato</span>
				</div>
				<div class="text-xs text-[#1C1917] space-y-0.5">
					<p class="font-semibold">{authStore.auth.user.email}</p>
					<p class="text-[#78716C]">
						Ruolo {authStore.auth.user.role} · installazione {authStore.auth.installationId.slice(0, 8)}
					</p>
				</div>
				<Button variant="outline" onclick={() => authStore.unlink()}>
					<LogOut class="w-3.5 h-3.5" /> Scollega questo browser
				</Button>
			</div>
		{:else}
			<div class="border-t border-[#E7DFD5] pt-3 space-y-3">
				<p class="text-xs text-[#57534E]">
					Sul sito Civitas apri <strong>Profilo → Estensione browser</strong> e genera un codice di
					collegamento.
				</p>

				<input
					bind:value={code}
					oninput={(e) => (code = e.currentTarget.value)}
					onblur={() => (code = code ? normalizeCode(code) : '')}
					placeholder="NC-XXXX-XXXX-XXXX"
					class="w-full rounded-xl border border-[#E7DFD5] bg-white px-3 py-2.5 text-center font-mono text-base tracking-[0.2em] uppercase focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200"
				/>

				{#if authStore.error}
					<Alert tone="error" message={authStore.error} />
				{/if}

				<Button full onclick={handleLink} disabled={authStore.linking || code.trim().length < 8}>
					{authStore.linking ? 'Collegamento in corso…' : 'Collega account'}
				</Button>
			</div>
		{/if}
	</div>

	<div class="bg-white border border-[#E7DFD5] rounded-2xl p-4 shadow-xs space-y-4">
		<div class="space-y-1.5">
			<label for="threshold" class="text-xs font-semibold text-[#1C1917]">
				Soglia dei rinvii candidati: {threshold.toFixed(2)}
			</label>
			<input
				id="threshold"
				type="range"
				min="0.3"
				max="0.95"
				step="0.05"
				value={threshold}
				oninput={(e) => (threshold = Number(e.currentTarget.value))}
				onchange={(e) => settingsStore.update({ candidateThreshold: Number(e.currentTarget.value) })}
				class="w-full accent-[#7A2222] cursor-pointer"
			/>
			<p class="text-[11px] text-[#78716C]">
				Più bassa, più articoli vengono proposti. Conviene privilegiare il recall: è meglio valutare
				un articolo in più che perdere un rinvio reale.
			</p>
		</div>

		<div class="space-y-1.5">
			<label for="batch" class="text-xs font-semibold text-[#1C1917]">
				Articoli per batch: {batchSize}
			</label>
			<input
				id="batch"
				type="range"
				min="1"
				max="20"
				step="1"
				value={batchSize}
				oninput={(e) => (batchSize = Number(e.currentTarget.value))}
				onchange={(e) => settingsStore.update({ batchSize: Number(e.currentTarget.value) })}
				class="w-full accent-[#7A2222] cursor-pointer"
			/>
			<p class="text-[11px] text-[#78716C]">
				Batch più piccoli producono risposte più affidabili e più facili da rivedere.
				{#if serverMax}Il server suggeriva {serverMax} come valore iniziale, ma da qui decidi tu.{/if}
			</p>
		</div>
	</div>

	<div class="bg-white border border-[#E7DFD5] rounded-2xl p-4 shadow-xs space-y-2">
		<div class="flex items-center gap-2 text-[#7A2222]">
			<ShieldCheck class="w-4 h-4" />
			<span class="text-[10px] font-bold uppercase tracking-widest">Privacy</span>
		</div>
		<ul class="text-[11px] text-[#57534E] space-y-1 list-disc pl-4">
			<li>L'estensione non legge le risposte dei modelli: le incolli tu.</li>
			<li>Non accede agli appunti, alla cronologia né ai cookie.</li>
			<li>Non invia mai automaticamente un messaggio nelle chat AI.</li>
			<li>Gli articoli scaricati restano nel browser finché non sottometti.</li>
		</ul>
		<p class="text-[10px] font-mono text-[#A8A29E] pt-1">
			estensione {getExtensionVersion()} · parser {REFERENCE_PARSER_VERSION} · {getBrowserId()}
		</p>
	</div>
</div>
