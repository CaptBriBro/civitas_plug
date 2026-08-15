/** Stato del collegamento con Civitas.
 *
 *  L'estensione funziona anche senza: consultare le attività, scaricare gli
 *  articoli e preparare i prompt non richiede account. La credenziale serve
 *  solo per sottomettere la proposta. */

export interface InstallationInfo {
  id: string;
  installation_id: string;
  browser: string;
  browser_version?: string | null;
  extension_version?: string | null;
  label?: string | null;
  created_at: string;
  last_seen_at?: string | null;
  revoked_at?: string | null;
  is_current: boolean;
}

export interface CivitasUser {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
  status: string;
}

export interface AuthState {
  credential: string;
  installationId: string;
  scopes: string[];
  user: CivitasUser;
  linkedAt: string;
}

export interface ActivateResponse {
  credential: string;
  installation_id: string;
  scopes: string[];
  user: CivitasUser;
  message: string;
}

export interface PluginMeResponse {
  user: CivitasUser;
  installation: InstallationInfo | null;
}
