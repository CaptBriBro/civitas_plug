import { describe, expect, it } from 'vitest';
import { isExpired, validatePromptResponse, MAX_PROMPT_LENGTH } from '@/features/prompts/promptValidation';
import { PromptError } from '@/services/api/errors';
import type { PromptResolveResponse } from '@/domain/prompt';

function makeResponse(overrides: Partial<PromptResolveResponse> = {}): PromptResolveResponse {
  return {
    request_id: 'pr_abc123',
    provider: 'chatgpt',
    task: 'normative_relation_extraction',
    prompt: {
      id: 'normative-relation-extraction-v2',
      name: 'normative-relation-extraction',
      version: 'v2',
      content: 'Sei un estrattore di relazioni normative…',
      hash: 'a'.repeat(64),
      rendered_hash: 'b'.repeat(64),
    },
    article_count: 1,
    generated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    cacheable: false,
    cache_ttl_seconds: 0,
    ...overrides,
  };
}

describe('validatePromptResponse', () => {
  it('accetta una risposta completa', () => {
    expect(() => validatePromptResponse(makeResponse(), 'chatgpt')).not.toThrow();
  });

  it('rifiuta un prompt vuoto', () => {
    const response = makeResponse();
    response.prompt.content = '   ';
    expect(() => validatePromptResponse(response, 'chatgpt')).toThrow(PromptError);
  });

  it('rifiuta un prompt privo di versione', () => {
    const response = makeResponse();
    response.prompt.version = '';
    expect(() => validatePromptResponse(response, 'chatgpt')).toThrow(/versionato/);
  });

  it('rifiuta un prompt destinato ad un altro provider', () => {
    expect(() => validatePromptResponse(makeResponse(), 'gemini')).toThrow(/gemini/);
  });

  it('rifiuta un prompt già scaduto', () => {
    const scaduto = makeResponse({ expires_at: new Date(Date.now() - 1000).toISOString() });
    expect(() => validatePromptResponse(scaduto, 'chatgpt')).toThrow(/scaduto/);
  });

  it('rifiuta un prompt oltre la dimensione gestibile', () => {
    const response = makeResponse();
    response.prompt.content = 'x'.repeat(MAX_PROMPT_LENGTH + 1);
    expect(() => validatePromptResponse(response, 'chatgpt')).toThrow(/dimensione/);
  });

  it('rifiuta una risposta senza request_id', () => {
    const response = makeResponse({ request_id: '' });
    expect(() => validatePromptResponse(response, 'chatgpt')).toThrow(/identificativo/);
  });
});

describe('isExpired', () => {
  it('considera valido un prompt senza scadenza', () => {
    expect(isExpired(null)).toBe(false);
    expect(isExpired(undefined)).toBe(false);
  });

  it('riconosce una scadenza passata', () => {
    expect(isExpired(new Date(Date.now() - 1000).toISOString())).toBe(true);
    expect(isExpired(new Date(Date.now() + 60_000).toISOString())).toBe(false);
  });
});
