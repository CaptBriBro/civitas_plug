<script lang="ts">
	import { CheckSquare, Link2, Settings } from 'lucide-svelte';
	import { router } from '@/router.svelte';
	import { authStore } from '@/stores/auth.svelte';

	const items = [
		{ hash: '#/', match: ['jobs', 'job', 'batch'], label: 'Attività Civitas', Icon: CheckSquare },
		{ hash: '#/link', match: ['link'], label: 'Account', Icon: Link2 },
		{ hash: '#/settings', match: ['settings'], label: 'Impostazioni', Icon: Settings }
	];
</script>

<aside
	class="w-56 shrink-0 bg-[#FAF6F0] border-r border-[#E7DFD5] p-4 flex flex-col justify-between"
>
	<nav class="space-y-1">
		{#each items as item (item.hash)}
			{@const active = item.match.includes(router.route.name)}
			<a
				href={item.hash}
				class="flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all
				{active ? 'bg-[#7A2222] text-white shadow-xs' : 'text-[#57534E] hover:bg-white/80 hover:text-[#1C1917]'}"
			>
				<item.Icon class="w-4 h-4" />
				{item.label}
			</a>
		{/each}
	</nav>

	<div class="rounded-2xl border border-[#E7DFD5] bg-white p-3 space-y-1">
		<p class="text-[10px] font-bold uppercase tracking-widest text-[#78716C]">Stato</p>
		<p class="text-[11px] text-[#1C1917] font-semibold truncate">{authStore.displayName}</p>
		{#if !authStore.isLinked}
			<p class="text-[10px] text-[#78716C] leading-relaxed">
				Puoi lavorare senza collegarti: l'account serve solo per sottomettere.
			</p>
		{/if}
	</div>
</aside>
