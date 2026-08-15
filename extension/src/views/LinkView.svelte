<script lang="ts">
	import { Link2, LogOut, ShieldCheck } from 'lucide-svelte';
	import Button from '@/components/ui/Button.svelte';
	import Alert from '@/components/ui/Alert.svelte';
	import EnvSelector from '@/components/settings/EnvSelector.svelte';
	import { authStore } from '@/stores/auth.svelte';
	import { normalizeCode } from '@/features/auth/activationService';

	let code = $state('');
	let linked = $state(false);

	async function handleLink() {
		linked = await authStore.link(code);
		if (linked) code = '';
	}
</script>

<div class="max-w-xl space-y-5">
	<div>
		<div class="flex items-center gap-2 text-[#7A2222]">
			<Link2 class="w-4 h-4" />
			<span class="text-[10px] font-bold uppercase tracking-widest">Account Civitas</span>
		</div>
		<h1 class="font-display text-2xl font-bold text-[#7A2222] mt-1">Collega l'estensione</h1>
		<p class="text-xs text-[#78716C] mt-1">
			Il collegamento serve solo per sottomettere le proposte. Consultare le attività, scaricare gli
			articoli e preparare le analisi funziona anche senza.
		</p>
	</div>

	<!-- L'ambiente va scelto prima di collegarsi: il codice vale su un solo server. -->
	<div class="bg-white border border-[#E7DFD5] rounded-2xl p-4 shadow-xs">
		<EnvSelector />
	</div>

	{#if authStore.isLinked && authStore.auth}
		<div class="bg-white border border-[#E7DFD5] rounded-2xl p-4 shadow-xs space-y-3">
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
		<div class="bg-white border border-[#E7DFD5] rounded-2xl p-4 shadow-xs space-y-3">
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
