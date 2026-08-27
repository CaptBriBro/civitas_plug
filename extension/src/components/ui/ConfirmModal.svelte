<script lang="ts">
	import { AlertTriangle, CheckCircle, HelpCircle, X } from 'lucide-svelte';

	interface Props {
		isOpen: boolean;
		title?: string;
		message?: string;
		confirmText?: string;
		cancelText?: string;
		variant?: 'emerald' | 'purple' | 'amber' | 'rose';
		onConfirm: () => void;
		onCancel: () => void;
	}

	let {
		isOpen = false,
		title = 'Conferma Operazione',
		message = 'Sei sicuro di voler procedere con questa operazione?',
		confirmText = 'Conferma',
		cancelText = 'Annulla',
		variant = 'emerald',
		onConfirm,
		onCancel
	}: Props = $props();

	let variantStyles = $derived.by(() => {
		switch (variant) {
			case 'purple':
				return {
					badgeBg: 'bg-purple-100 text-purple-800',
					btnConfirm: 'bg-purple-700 hover:bg-purple-800 text-white'
				};
			case 'amber':
				return {
					badgeBg: 'bg-amber-100 text-amber-800',
					btnConfirm: 'bg-amber-600 hover:bg-amber-700 text-white'
				};
			case 'rose':
				return {
					badgeBg: 'bg-rose-100 text-rose-800',
					btnConfirm: 'bg-rose-600 hover:bg-rose-700 text-white'
				};
			default:
				return {
					badgeBg: 'bg-emerald-100 text-emerald-800',
					btnConfirm: 'bg-emerald-700 hover:bg-emerald-800 text-white'
				};
		}
	});
</script>

{#if isOpen}
	<div class="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in font-sans">
		<div class="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95">
			<!-- Header -->
			<div class="px-6 pt-6 pb-3 flex items-start justify-between gap-3">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 {variantStyles.badgeBg}">
						{#if variant === 'purple'}
							<HelpCircle class="w-5 h-5 text-purple-700" />
						{:else if variant === 'amber' || variant === 'rose'}
							<AlertTriangle class="w-5 h-5 text-amber-700" />
						{:else}
							<CheckCircle class="w-5 h-5 text-emerald-700" />
						{/if}
					</div>
					<div>
						<h3 class="text-base font-bold text-stone-900 leading-tight">
							{title}
						</h3>
					</div>
				</div>
				<button
					type="button"
					onclick={onCancel}
					class="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
				>
					<X class="w-4 h-4" />
				</button>
			</div>

			<!-- Message body -->
			<div class="px-6 py-2">
				<p class="text-xs text-stone-700 leading-relaxed font-serif">
					{message}
				</p>
			</div>

			<!-- Footer action buttons -->
			<div class="px-6 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-2.5 mt-3">
				<button
					type="button"
					onclick={onCancel}
					class="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-white border border-stone-250 hover:bg-stone-100 transition-colors cursor-pointer"
				>
					{cancelText}
				</button>
				<button
					type="button"
					onclick={onConfirm}
					class="px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs {variantStyles.btnConfirm}"
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
