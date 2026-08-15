<script lang="ts">
	import { ArrowRight, BookOpen, FolderClock } from 'lucide-svelte';
	import Badge from '@/components/ui/Badge.svelte';
	import type { JobSummary } from '@/domain/job';

	interface Props {
		job: JobSummary;
		started?: boolean;
		onopen: (job: JobSummary) => void;
	}

	let { job, started = false, onopen }: Props = $props();
</script>

<button
	onclick={() => onopen(job)}
	class="w-full text-left bg-white border border-[#E7DFD5] rounded-2xl p-4 shadow-xs hover:border-[#78716C] transition-colors cursor-pointer group"
>
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<h3 class="font-display text-sm font-semibold text-[#1C1917] truncate">{job.title}</h3>
			<p class="text-[11px] text-[#78716C] mt-0.5 line-clamp-2">{job.description}</p>
		</div>
		<ArrowRight
			class="w-4 h-4 shrink-0 text-[#A8A29E] group-hover:text-[#7A2222] transition-colors"
		/>
	</div>

	<div class="flex items-center gap-2 mt-3 flex-wrap">
		{#if job.article_count}
			<Badge variant="stone">
				<BookOpen class="w-3 h-3" />
				{job.article_start}–{job.article_end} · {job.article_count} artt.
			</Badge>
		{/if}
		{#if started}
			<Badge variant="purple">
				<FolderClock class="w-3 h-3" /> In lavorazione
			</Badge>
		{/if}
	</div>
</button>
