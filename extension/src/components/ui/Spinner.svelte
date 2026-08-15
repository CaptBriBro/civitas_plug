<script lang="ts">
	import { Loader2 } from 'lucide-svelte';

	interface Props {
		size?: number;
		tone?: 'terracotta' | 'ai' | 'muted';
	}

	let { size = 16, tone = 'terracotta' }: Props = $props();

	const tones = {
		terracotta: 'text-[#7A2222]',
		ai: 'text-purple-700',
		muted: 'text-[#78716C]'
	};
</script>

<Loader2 class="animate-spin {tones[tone]}" width={size} height={size} />
