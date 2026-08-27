/** Il flusso che parte dal click su "Analizza con ChatGPT/Gemini".
 *
 *  Ordine: **prima** si prova a chiedere il prompt a Civitas. Se il backend è
 *  offline o non raggiungibile, si genera un prompt locale di fallback per non
 *  bloccare l'utente. Poi si apre/mette a fuoco il provider su una nuova chat.
 */
import type { ProviderId } from '@/domain/prompt';
import type { Workset, WorksetBatch } from '@/domain/workset';
import { resolvePrompt } from '@/services/api/endpoints/prompts';
import { articlesForBatch, actUpdatesForBatch } from '@/features/results/batching';
import { savePending } from '@/services/storage/pendingStore';
import { updateBatch } from '@/services/storage/worksetStore';
import { getInstallationId } from '@/services/storage/authStore';
import { validatePromptResponse } from '@/features/prompts/promptValidation';
import { openProviderTab } from '@/services/browser/browserService';
import { getAdapter } from '@/adapters/ai/registry';
import { PromptError } from '@/services/api/errors';

export interface StartAnalysisResult {
	batch: WorksetBatch;
	promptContent: string;
	reused: boolean;
	fallback?: boolean;
}

function canReuse(batch: WorksetBatch, provider: ProviderId): boolean {
	if (batch.provider !== provider) return false;
	if (!batch.promptContent || !batch.promptRequestId || !batch.promptExpiresAt) return false;
	return new Date(batch.promptExpiresAt).getTime() > Date.now();
}

/** Costruisce un prompt locale di fallback se il backend Civitas non è raggiungibile. */
function buildLocalFallbackPrompt(workset: Workset, batch: WorksetBatch): string {
	if (workset.actUpdates && workset.actUpdates.length > 0) {
		const updates = actUpdatesForBatch(workset, batch);
		const updatesText = updates
			.map((u, idx) => {
				let head = `[${idx + 1}] Aggiornamento Progr. ${u.progr || idx + 1}`;
				if (u.data_pubblicazione) head += ` (Pubblicazione: ${u.data_pubblicazione})`;
				if (u.atto_modificante) head += `\nAtto Modificante: ${u.atto_modificante}`;
				return `${head}\nDisposizione Novellante: "${u.testo_disposizione}"`;
			})
			.join('\n\n');

		return (
			'Sei un assistente specializzato nell\'analisi formale e strutturata della cronistoria delle modifiche legislative italiane (Aggiornamenti all\'Atto Normattiva).\n\n' +
			'Il tuo compito è analizzare ciascuna riga di aggiornamento/novella normativa fornita ed estrarre le relazioni giuridiche puntuali tra l\'ATTO MODIFICANTE (fonte della modifica) e le SINGOLE DISPOSIZIONI BERSAGLIO (articoli, commi abrogati, modificati, sostituiti o inseriti).\n\n' +
			'REGOLE TASSATIVE DI ESTRAZIONE:\n' +
			'1. Identifica l\'Atto Modificante con gli estremi normativi esatti (tipo, numero, anno, data).\n' +
			'2. Per ciascuna disposizione dell\'atto bersaglio modificata o abrogata, genera una specifica relazione con target_article, target_paragraph, relation_type (ABROGATION, MODIFICATION, REPLACEMENT, INSERTION) ed evidence.\n\n' +
			'OUTPUT SCHEMA (JSON OBBLIGATORIO):\n' +
			'{\n' +
			'  "relations": [\n' +
			'    {\n' +
			'      "object_kind": "EFFECT",\n' +
			'      "family": "AMENDMENT",\n' +
			'      "relation_type": "ABROGATION",\n' +
			'      "target_article": "1",\n' +
			'      "target_paragraph": "3",\n' +
			'      "source_act": {\n' +
			'        "type": "REGIO_DECRETO_LEGGE",\n' +
			'        "number": "25",\n' +
			'        "year": "1944",\n' +
			'        "article": "Art. 1, comma 1"\n' +
			'      },\n' +
			'      "evidence": "ha disposto (con l\'art. 1, comma 1) l\'abrogazione del comma terzo dell\'art. 1.",\n' +
			'      "confidence": 0.99\n' +
			'    }\n' +
			'  ]\n' +
			'}\n\n' +
			'---\n\n' +
			`Cronistoria delle Novelle e Aggiornamenti all'Atto da analizzare (${updates.length} ${updates.length === 1 ? 'voce' : 'voci'} di aggiornamento):\n\n` +
			updatesText
		);
	}

	const articles = articlesForBatch(workset, batch);
	const articlesText = articles
		.map((art, idx) => {
			let head = `[${idx + 1}] Articolo ${art.numero}`;
			if (art.rubrica) head += ` — ${art.rubrica}`;
			let text = `"${art.testo}"`;
			if (art.candidates && art.candidates.length > 0) {
				const candidateSnippets = art.candidates
					.slice(0, 6)
					.map((c) => c.text)
					.join('; ');
				text += `\nSegmenti candidati individuati localmente: ${candidateSnippets}`;
			}
			return `${head}\n${text}`;
		})
		.join('\n\n');

	return (
		'Sei un assistente esperto in analisi normativa e giuridica per Civitas.\n' +
		'Il tuo compito è individuare e strutturare tutte le relazioni normative, abrogazioni, deroghe e rinvii presenti nel testo dei seguenti articoli.\n\n' +
		'Formato di risposta richiesto (JSON):\n' +
		'{\n' +
		'  "relations": [\n' +
		'    {\n' +
		'      "source_article": "2043",\n' +
		'      "target_article": "2044",\n' +
		'      "family": "APPLICATION",\n' +
		'      "relation_type": "DIRECT",\n' +
		'      "evidence": "salvo quanto previsto dall\'articolo 2044"\n' +
		'    }\n' +
		'  ]\n' +
		'}\n\n' +
		'---\n\n' +
		`Testo delle Disposizioni Normative da analizzare (${articles.length} ${articles.length === 1 ? 'articolo' : 'articoli'}):\n\n` +
		articlesText
	);
}

export async function startAnalysis(
	workset: Workset,
	batch: WorksetBatch,
	provider: ProviderId,
	options: { openProvider?: boolean } = {}
): Promise<StartAnalysisResult> {
	const adapter = getAdapter(provider);
	const installationId = await getInstallationId();

	let resolved = batch;
	let reused = false;
	let usedFallback = false;

	if (canReuse(batch, provider)) {
		reused = true;
	} else {
		let promptArticlesPayload: any[] = [];

		if (workset.actUpdates && workset.actUpdates.length > 0) {
			const updates = actUpdatesForBatch(workset, batch);
			if (updates.length === 0) {
				throw new PromptError('Il batch non contiene voci di aggiornamento da analizzare.');
			}
			promptArticlesPayload = updates.map((u, idx) => ({
				numero: u.progr || String(idx + 1),
				progr: u.progr || String(idx + 1),
				data_pubblicazione: u.data_pubblicazione || '',
				atto_modificante: u.atto_modificante || '',
				testo: u.testo_disposizione,
				rubrica: u.atto_modificante || 'Novella legislativa',
				candidates: u.target_articles_detected || [],
			}));
		} else {
			const articles = articlesForBatch(workset, batch);
			if (articles.length === 0) {
				throw new PromptError('Il batch non contiene articoli da analizzare.');
			}
			promptArticlesPayload = articles.map((article) => ({
				numero: article.numero,
				testo: article.testo,
				rubrica: article.rubrica,
				candidates: article.candidates.slice(0, 6).map((candidate) => candidate.text),
			}));
		}

		let promptContent = '';
		let requestId = `local-${crypto.randomUUID()}`;
		let promptId = 'local-fallback-v1';
		let expiresAt = new Date(Date.now() + 3_600_000).toISOString();

		try {
			const response = await resolvePrompt({
				jobId: workset.jobId,
				provider,
				installationId,
				articles: promptArticlesPayload,
			});

			validatePromptResponse(response, provider);
			promptContent = response.prompt.content;
			requestId = response.request_id;
			promptId = response.prompt.id;
			expiresAt = response.expires_at;
		} catch (err) {
			// Fallback locale in caso di backend offline o irraggiungibile
			console.warn('[Civitas Plugin] Backend non raggiungibile per il prompt, uso fallback locale:', err);
			usedFallback = true;
			promptContent = buildLocalFallbackPrompt(workset, batch);
		}

		const updated = await updateBatch(workset.jobId, batch.id, {
			status: 'prompt_ready',
			provider,
			promptRequestId: requestId,
			promptId: promptId,
			promptVersion: 'v1',
			promptContent: promptContent,
			promptExpiresAt: expiresAt,
			errorMessage: undefined
		});

		resolved = updated?.batches.find((b) => b.id === batch.id) ?? {
			...batch,
			status: 'prompt_ready',
			provider,
			promptRequestId: requestId,
			promptContent: promptContent
		};
	}

	const promptContent = resolved.promptContent!;

	await savePending({
		provider,
		id: crypto.randomUUID(),
		jobId: workset.jobId,
		batchId: batch.id,
		promptRequestId: resolved.promptRequestId!,
		promptId: resolved.promptId ?? '',
		promptVersion: resolved.promptVersion ?? '',
		promptHash: resolved.promptHash ?? '',
		prompt: promptContent,
		createdAt: Date.now(),
		expiresAt: new Date(resolved.promptExpiresAt ?? Date.now() + 3_600_000).getTime(),
		status: 'pending'
	});

	if (options.openProvider !== false) {
		// Riusa o apre la scheda del provider aprendo una nuova chat
		await openProviderTab(adapter.getUrl(), `${adapter.getUrl()}*`);
		await updateBatch(workset.jobId, batch.id, { status: 'awaiting_ai' });
	}

	return { batch: resolved, promptContent, reused, fallback: usedFallback };
}
