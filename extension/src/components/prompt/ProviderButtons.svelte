<script lang="ts">
	import { Copy, Check, Sparkles, Layers, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-svelte';
	import Button from '@/components/ui/Button.svelte';
	import Alert from '@/components/ui/Alert.svelte';
	import ProgressBar from '@/components/ui/ProgressBar.svelte';
	import Badge from '@/components/ui/Badge.svelte';
	import { settingsStore } from '@/stores/settings.svelte';
	import { worksetStore } from '@/stores/workset.svelte';
	import { copyToClipboard } from '@/services/browser/browserService';
	import type { ProviderId } from '@/domain/prompt';
	import type { WorksetBatch } from '@/domain/workset';

	interface Props {
		batch: WorksetBatch;
	}

	let { batch }: Props = $props();

	let copied = $state(false);
	let showPrompt = $state(false);
	let activeFlowProvider = $state<ProviderId | 'both' | null>(null);

	let busy = $derived(worksetStore.busyBatchId === batch.id);
	let insertionFailed = $derived(batch.status === 'prompt_ready' && !!batch.errorMessage);
	let hasPrompt = $derived(!!batch.promptContent);
	let hasResponse = $derived(
		!!(batch.rawResponseChatGPT?.trim() || batch.rawResponseGemini?.trim() || batch.rawResponse?.trim())
	);
	let targetProvider = $derived(activeFlowProvider || batch.provider || 'chatgpt');

	async function analyze(provider: ProviderId) {
		activeFlowProvider = provider;
		await worksetStore.analyzeBatch(batch, provider);
	}

	async function analyzeBoth() {
		activeFlowProvider = 'both';
		await worksetStore.analyzeBatch(batch, 'chatgpt');
		await worksetStore.analyzeBatch(batch, 'gemini');
	}

	async function copyPrompt() {
		if (!batch.promptContent) return;
		copied = await copyToClipboard(batch.promptContent);
		setTimeout(() => (copied = false), 2000);
	}

	function openProviderPage(provider: ProviderId = 'chatgpt') {
		const url = provider === 'chatgpt' ? 'https://chatgpt.com/' : 'https://gemini.google.com/app';
		window.open(url, '_blank');
	}
</script>

<div class="ai-surface rounded-2xl p-4 space-y-4">
	<div>
		<h3 class="font-display text-sm font-semibold text-purple-950 flex items-center gap-1.5">
			<Sparkles class="w-4 h-4 text-purple-700" /> Analisi con AI
		</h3>
		<p class="text-[11px] text-purple-900/80 mt-0.5">
			Le istruzioni vengono generate da Civitas al momento del click. L'estensione apre il provider e compila la chat.
		</p>
	</div>

	<!-- TASTI PER AVVIARE L'ANALISI (MAI BLROCCATI SE SI INVIA A UNO SOLO) -->
	<div class="flex gap-2 flex-wrap">
		<Button variant="ai" size="sm" onclick={() => analyze('chatgpt')} disabled={busy}>
			<Sparkles class="w-3.5 h-3.5" /> Invia a ChatGPT
		</Button>

		<Button variant="ai" size="sm" onclick={() => analyze('gemini')} disabled={busy}>
			<Sparkles class="w-3.5 h-3.5" /> Invia a Gemini
		</Button>

		<Button variant="outline" size="sm" onclick={analyzeBoth} disabled={busy}>
			<Layers class="w-3.5 h-3.5 text-purple-700" /> Invia a Entrambi
		</Button>
	</div>

	<!-- STATO CARICAMENTO PROMPT DAL BACKEND -->
	{#if busy}
		<div class="space-y-2 p-3.5 rounded-xl bg-purple-50 border border-purple-200 animate-in fade-in">
			<div class="flex items-center justify-between">
				<p class="text-xs font-bold text-purple-950 flex items-center gap-1.5">
					<RefreshCw class="w-4 h-4 text-purple-700 animate-spin" />
					Generazione del prompt ed invio alla chat in corso...
				</p>
				<Badge variant="purple">In corso</Badge>
			</div>
			<ProgressBar indeterminate tone="ai" />
		</div>
	{/if}

	<!-- STATO MESSAGGIO GENERATO / APRI TAB / RISPOSTA REGISTRATA -->
	{#if hasPrompt && !busy}
		<div class="p-3.5 rounded-xl bg-white border border-purple-200 space-y-3 shadow-2xs">
			<div class="flex items-center justify-between flex-wrap gap-2">
				<span class="text-xs font-bold text-purple-950 flex items-center gap-1.5">
					{#if hasResponse}
						<CheckCircle2 class="w-4 h-4 text-emerald-600" /> 3. Risposta AI registrata! Analisi completata.
					{:else}
						<Sparkles class="w-4 h-4 text-purple-700" /> 1. Prompt Inviato & Pronto nella Chat {targetProvider === 'gemini' ? 'Gemini' : targetProvider === 'chatgpt' ? 'ChatGPT' : 'ChatGPT e Gemini'}
					{/if}
				</span>
				<div class="flex gap-2">
					{#if targetProvider === 'chatgpt'}
						<button
							type="button"
							onclick={() => openProviderPage('chatgpt')}
							class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-100 text-purple-900 border border-purple-300 hover:bg-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
						>
							<ExternalLink class="w-3 h-3 text-purple-700" /> Apri ChatGPT
						</button>
					{:else if targetProvider === 'gemini'}
						<button
							type="button"
							onclick={() => openProviderPage('gemini')}
							class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-100 text-blue-900 border border-blue-300 hover:bg-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
						>
							<ExternalLink class="w-3 h-3 text-blue-700" /> Apri Gemini
						</button>
					{:else}
						<button
							type="button"
							onclick={() => openProviderPage('chatgpt')}
							class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-100 text-purple-900 border border-purple-300 hover:bg-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
						>
							<ExternalLink class="w-3 h-3 text-purple-700" /> Apri ChatGPT
						</button>
						<button
							type="button"
							onclick={() => openProviderPage('gemini')}
							class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-100 text-blue-900 border border-blue-300 hover:bg-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
						>
							<ExternalLink class="w-3 h-3 text-blue-700" /> Apri Gemini
						</button>
					{/if}
				</div>
			</div>

			<div class="flex items-center gap-2 flex-wrap pt-1 border-t border-purple-100 text-xs">
				<button
					onclick={() => (showPrompt = !showPrompt)}
					class="text-[11px] font-semibold text-purple-800 hover:underline cursor-pointer"
				>
					{showPrompt ? 'Nascondi prompt' : 'Visualizza prompt inviato'}
				</button>
				{#if batch.promptId}
					<span class="text-[10px] font-mono text-purple-900 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded-lg">
						{batch.promptId}
					</span>
				{/if}
				<button
					onclick={copyPrompt}
					class="text-[11px] font-bold text-purple-900 hover:underline cursor-pointer flex items-center gap-1"
				>
					{#if copied}<Check class="w-3 h-3 text-emerald-600" /> Copiato!{:else}<Copy class="w-3 h-3 text-purple-700" /> Copia prompt{/if}
				</button>
			</div>

			{#if showPrompt}
				<pre class="max-h-64 overflow-auto rounded-xl bg-[#FAF6F0] border border-purple-200 p-3 text-[10px] font-mono text-[#1C1917] whitespace-pre-wrap">{batch.promptContent}</pre>
			{/if}
		</div>
	{/if}

	{#if insertionFailed}
		<Alert tone="warning" message={batch.errorMessage ?? ''}>
			<p class="text-[11px]">
				Il prompt è pronto: copialo e incollalo a mano nella chat, il lavoro non va perso.
			</p>
			<Button size="sm" variant="ai" onclick={copyPrompt}>
				{#if copied}<Check class="w-3.5 h-3.5" /> Copiato{:else}<Copy class="w-3.5 h-3.5" /> Copia prompt{/if}
			</Button>
		</Alert>
	{/if}
</div>
