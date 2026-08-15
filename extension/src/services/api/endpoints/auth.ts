import { api } from '../client';
import { getExtensionVersion, getBrowserId, getBrowserVersion } from '@/config/version';
import type { ActivateResponse, PluginMeResponse } from '@/domain/auth';

export function activate(code: string, installationId: string): Promise<ActivateResponse> {
  return api.post<ActivateResponse>('/plugin/activate', {
    code,
    installation_id: installationId,
    browser: getBrowserId(),
    browser_version: getBrowserVersion() ?? null,
    extension_version: getExtensionVersion(),
    label: null,
  });
}

export function fetchMe(credential: string, installationId: string): Promise<PluginMeResponse> {
  return api.get<PluginMeResponse>('/plugin/me', { credential, installationId });
}

export function logout(credential: string, installationId: string) {
  return api.post<{ revoked: boolean; message: string }>('/plugin/logout', undefined, {
    credential,
    installationId,
  });
}
