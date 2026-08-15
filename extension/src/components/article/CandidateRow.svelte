<script lang="ts">
	import Badge from '@/components/ui/Badge.svelte';
	import type { ComponentProps } from 'svelte';
	import type { ReferenceCandidate } from '@/domain/candidate';

	type BadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>;

	interface Props {
		candidate: ReferenceCandidate;
	}

	let { candidate }: Props = $props();

	let tone = $derived<BadgeVariant>(
		candidate.confidence >= 0.85 ? 'green' : candidate.confidence >= 0.6 ? 'amber' : 'stone'
	);
</script>

<div class="rounded-xl border border-[#E7DFD5] bg-white p-2.5 space-y-1.5">
	<div class="flex items-center gap-2 flex-wrap">
		<Badge variant={tone}>{Math.round(candidate.confidence * 100)}%</Badge>
		<span class="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">
			{candidate.label}
		</span>
	</div>
	<p class="text-[11px] text-[#57534E] leading-relaxed italic">"{candidate.text}"</p>
</div>
