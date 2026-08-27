import type { ExtractedRelation } from '../domain/workset';
import type { LegalArticle } from '../domain/article';

export function getFamilyVariant(family?: string): 'purple' | 'green' | 'amber' | 'red' | 'stone' {
	switch (family?.toUpperCase()) {
		case 'REFERENCE':
			return 'purple';
		case 'APPLICATION':
			return 'purple';
		case 'AMENDMENT':
			return 'green';
		case 'PRECEDENCE':
			return 'amber';
		default:
			return 'stone';
	}
}

export function getTargetStatus(
	target: string | undefined,
	allLocalWorksets: Array<{ jobId: string; jobTitle: string }>,
	articles?: LegalArticle[],
	currentJobTitle?: string
) {
	if (!target) return null;

	const targetClean = target.trim().toLowerCase();

	const isExternalAct =
		targetClean.includes('legge') ||
		targetClean.includes('d.lgs') ||
		targetClean.includes('d.l.') ||
		targetClean.includes('d.p.r') ||
		targetClean.includes('r.d.') ||
		targetClean.includes('decreto') ||
		targetClean.includes('regio') ||
		targetClean.includes('costituzione') ||
		targetClean.includes('codice');

	if (!isExternalAct) {
		// Se il target è un semplice numero di articolo (es: "1", "91", "155", "Art. 1")
		// senza menzione esplicita di una legge esterna, appartiene all'atto interno corrente!
		return { type: 'internal', label: 'Interno • Presente', color: 'green' };
	}

	// Se menziona l'atto corrente nel titolo target
	if (currentJobTitle) {
		const currentClean = currentJobTitle.toLowerCase();
		if (targetClean.includes(currentClean) || currentClean.includes(targetClean)) {
			return { type: 'internal', label: 'Interno • Presente', color: 'green' };
		}
	}

	const yearMatch = targetClean.match(/\b(19\d\d|20\d\d)\b/);
	const numMatch =
		targetClean.match(/n\.\s*(\d+)/i) ||
		targetClean.match(/\bno?\.\s*(\d+)/i) ||
		targetClean.match(/\b(\d+)\b/);

	const year = yearMatch ? yearMatch[1] : null;
	const num = numMatch ? numMatch[1] : null;

	let isDownloaded = false;
	let matchedJobTitle = '';

	for (const w of allLocalWorksets) {
		const titleClean = w.jobTitle.toLowerCase();
		const idClean = w.jobId.toLowerCase();

		if (
			titleClean.includes(targetClean) ||
			targetClean.includes(titleClean) ||
			idClean.includes(targetClean)
		) {
			isDownloaded = true;
			matchedJobTitle = w.jobTitle;
			break;
		}

		if (year && num) {
			const hasYear = titleClean.includes(year) || idClean.includes(year);
			const hasNum = titleClean.includes(num) || idClean.includes(num);
			if (hasYear && hasNum) {
				isDownloaded = true;
				matchedJobTitle = w.jobTitle;
				break;
			}
		}
	}

	if (isDownloaded) {
		return {
			type: 'downloaded',
			label: 'Esterno • Scaricato',
			matchedTitle: matchedJobTitle,
			color: 'stone'
		};
	}

	return {
		type: 'broken',
		label: 'Esterno • Broken Link (Da scaricare)',
		color: 'amber'
	};
}

export function getSourceStatus(
	rel: ExtractedRelation,
	allLocalWorksets: Array<{ jobId: string; jobTitle: string }>,
	currentJobTitle?: string
) {
	if (rel.source_act && typeof rel.source_act === 'object') {
		const type = String(rel.source_act.type || '').trim().toLowerCase();
		const number = String(rel.source_act.number || '').trim().toLowerCase();
		const year = String(rel.source_act.year || '').trim().toLowerCase();

		if (!type && !number && !year) {
			return { type: 'internal', label: 'Interno • Presente', color: 'green' };
		}

		// Controlla se l'atto sorgente è l'atto dell'attività corrente
		if (currentJobTitle) {
			const currentClean = currentJobTitle.toLowerCase();
			if (number && (currentClean.includes(number) || currentClean.includes(`n. ${number}`))) {
				if (!year || currentClean.includes(year)) {
					return { type: 'internal', label: 'Interno • Presente', color: 'green' };
				}
			}
		}

		let isDownloaded = false;
		let matchedJobTitle = '';

		for (const w of allLocalWorksets) {
			const titleClean = w.jobTitle.toLowerCase();
			const idClean = w.jobId.toLowerCase();

			if (year && number) {
				const hasYear = titleClean.includes(year) || idClean.includes(year);
				const hasNum = titleClean.includes(number) || idClean.includes(number);
				if (hasYear && hasNum) {
					isDownloaded = true;
					matchedJobTitle = w.jobTitle;
					break;
				}
			} else if (number) {
				const hasNum = titleClean.includes(number) || idClean.includes(number);
				if (hasNum) {
					isDownloaded = true;
					matchedJobTitle = w.jobTitle;
					break;
				}
			}
		}

		if (isDownloaded) {
			return {
				type: 'downloaded',
				label: 'Esterno • Scaricato',
				matchedTitle: matchedJobTitle,
				color: 'stone'
			};
		}

		return {
			type: 'broken',
			label: 'Esterno • Broken Link (Da scaricare)',
			color: 'amber'
		};
	}

	return { type: 'internal', label: 'Interno • Presente', color: 'green' };
}

export function getRelationLinkStatus(
	rel: ExtractedRelation,
	isSource: boolean,
	allLocalWorksets: Array<{ jobId: string; jobTitle: string }>,
	articles?: LegalArticle[],
	currentJobTitle?: string,
	isUpdatesTask?: boolean
) {
	const status = isSource
		? getSourceStatus(rel, allLocalWorksets, currentJobTitle, isUpdatesTask)
		: getTargetStatus(rel.target_article, allLocalWorksets, articles, currentJobTitle);

	const isBrokenRel = rel.is_broken === true || rel.link_status === 'BROKEN_LINK';
	const isResolvedRel = rel.link_status === 'RESOLVED_LINK';

	if (isResolvedRel) {
		return {
			type: 'resolved',
			label: 'Esterno • Broken Link (Risolto)',
			color: 'green'
		};
	}

	if (status?.type === 'internal') {
		return {
			type: 'internal',
			label: 'Interno • Presente',
			color: 'green'
		};
	}

	if (status?.type === 'downloaded') {
		return {
			type: 'downloaded',
			label: 'Esterno • Scaricato',
			color: 'stone'
		};
	}

	if (isBrokenRel || status?.type === 'broken') {
		return {
			type: 'broken',
			label: 'Esterno • Broken Link (Da scaricare)',
			color: 'amber'
		};
	}

	return {
		type: 'creatable',
		label: 'Esterno • Link Creabile',
		color: 'green'
	};
}

export function getRelKey(rel: ExtractedRelation, prefix: string, idx?: number): string {
	const p = rel.target_paragraph ? `_p${rel.target_paragraph}` : '';
	const t = rel.relation_type ? `_t${rel.relation_type}` : '';
	const ev = rel.evidence ? `_${rel.evidence.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15)}` : '';
	const i = idx !== undefined ? `_i${idx}` : '';
	return `${prefix}_${rel.source_article || 'src'}_${rel.target_article || 'tgt'}${p}_${rel.family || 'fam'}${t}${ev}${i}`;
}
