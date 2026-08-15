<script lang="ts">
	import { Send, CheckCircle2, KeyRound, X } from 'lucide-svelte';
	import Button from '@/components/ui/Button.svelte';
	import Alert from '@/components/ui/Alert.svelte';
	import TextArea from '@/components/ui/TextArea.svelte';
	import { worksetStore } from '@/stores/workset.svelte';
	import { authStore } from '@/stores/auth.svelte';
	import { previewSubmission, submit, defaultReason } from '@/features/results/submitService';
	import { messageFor } from '@/services/api/errors';
	import { router } from '@/router.svelte';

	let showModal = $state(false);
	let reason = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	let preview = $derived(
		worksetStore.workset ? previewSubmission(worksetStore.workset, authStore.isLinked) : null
	);

	$effect(() => {
		if (worksetStore.workset && !reason) reason = defaultReason(worksetStore.workset);
	});

	function openModal() {
		error = null;
		success = null;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	async function handleSubmit() {
		if (!worksetStore.workset) return;
		submitting = true;
		error = null;
		try {
			const response = await submit(worksetStore.workset, reason);
			success = response.message;
		} catch (err) {
			error = messageFor(err);
		} finally {
			submitting = false;
		}
	}
</script>

{#if preview}
	<!-- Trigger Button (Matching civitas_cli frontend) -->
	<Button
		variant="primary"
		size="sm"
		onclick={openModal}
		disabled={submitting}
	>
		<Send class="w-3.5 h-3.5" />
		Sottometti proposal a Civitas
	</Button>

	<!-- Submit Modal Dialog Overlay (Matching civitas_cli SubmitTokenModal) -->
	{#if showModal}
		<div
			class="fixed inset-0 z-50 bg-[#1C1917]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
			onclick={(e) => {
				if (e.target === e.currentTarget) closeModal();
			}}
			onkeydown={(e) => {
				if (e.key === 'Escape') closeModal();
			}}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div class="bg-white max-w-md w-full rounded-2xl p-6 border border-[#E7DFD5] shadow-2xl space-y-4 text-left">
				<!-- Header -->
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-2.5">
						<div class="p-2 rounded-xl bg-[#FAF6F0] text-[#7A2222] border border-[#E7DFD5]">
							<KeyRound class="w-5 h-5" />
						</div>
						<div>
							<h3 class="text-base font-bold font-display text-[#7A2222]">Sottometti Proposta Normativa</h3>
							<p class="text-[11px] text-[#78716C]">Sottomissione risultati al server Civitas</p>
						</div>
					</div>

					<button onclick={closeModal} class="p-1.5 rounded-xl hover:bg-[#FAF6F0] text-[#78716C] hover:text-[#1C1917] cursor-pointer">
						<X class="w-5 h-5" />
					</button>
				</div>

				<div class="p-3 bg-[#FAF6F0] rounded-xl border border-[#E7DFD5] text-xs text-[#57534E]">
					<strong class="font-bold text-[#1C1917] block mb-0.5">Riepilogo proposta:</strong>
					{preview.relations} relazioni da {preview.batches} {preview.batches === 1 ? 'batch' : 'batch'} importati su {preview.articles} articoli.
				</div>

				{#if success}
					<Alert tone="success" message={success}>
						<Button size="sm" variant="outline" onclick={() => { closeModal(); router.toJobs(); }}>
							<CheckCircle2 class="w-3.5 h-3.5" /> Torna alle attività
						</Button>
					</Alert>
				{:else}
					{#if error}
						<Alert tone="error" message={error} />
					{/if}

					<div>
						<label for="submit-proposal-reason" class="text-xs text-[#1C1917] font-semibold block mb-1">Motivazione o nota della proposta:</label>
						<TextArea id="submit-proposal-reason" bind:value={reason} rows={3} placeholder="Motivazione della proposta…" />
					</div>

					{#if !preview.canSubmit}
						<Alert tone="info" message={preview.blockingReason ?? ''}>
							{#if !authStore.isLinked}
								<Button size="sm" variant="ai" onclick={() => { closeModal(); router.go('#/link'); }}>
									Collega l'account
								</Button>
							{/if}
						</Alert>
					{/if}

					<div class="flex items-center justify-end gap-3 pt-2 border-t border-[#E7DFD5]">
						<Button variant="outline" size="sm" onclick={closeModal}>Annulla</Button>
						<Button
							variant="primary"
							size="sm"
							onclick={handleSubmit}
							disabled={!preview.canSubmit || submitting || reason.trim().length < 3}
						>
							<Send class="w-3.5 h-3.5" />
							{submitting ? 'Invio in corso…' : 'Autentica e Sottometti'}
						</Button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
{/if}
