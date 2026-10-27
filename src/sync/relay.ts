/**
 * Optional peer sync.
 *
 * One device is Host and publishes the event; others join with a 6-character
 * code. This is strictly additive — the app is fully functional with no
 * network and never blocks on the relay.
 *
 * The transport is deliberately small: any endpoint that accepts a POST of
 * {code, payload} and returns the latest payload for a GET of ?code= will do,
 * including a Supabase edge function or a 20-line worker. Configure the URL in
 * Settings; when it is blank, sync is simply off.
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1

export function generateCode(): string {
  return Array.from(
    { length: 6 },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
  ).join('');
}

export interface SyncPayload {
  code: string;
  updatedAt: number;
  event: unknown;
  groups: unknown;
  cards: unknown;
  players: unknown;
  course: unknown;
}

export interface RelayConfig {
  url: string;
  enabled: boolean;
}

export function loadRelayConfig(): RelayConfig {
  try {
    const raw = localStorage.getItem('pgc.relay');
    if (!raw) return { url: '', enabled: false };
    return JSON.parse(raw) as RelayConfig;
  } catch {
    return { url: '', enabled: false };
  }
}

export function saveRelayConfig(cfg: RelayConfig): void {
  try {
    localStorage.setItem('pgc.relay', JSON.stringify(cfg));
  } catch {
    /* storage unavailable — sync stays off, scoring is unaffected */
  }
}

/** Push the host's state. Never throws: a failed sync must not interrupt scoring. */
export async function publish(
  cfg: RelayConfig,
  payload: SyncPayload,
): Promise<{ ok: boolean; error?: string }> {
  if (!cfg.enabled || !cfg.url) return { ok: false, error: 'sync disabled' };
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok ? { ok: true } : { ok: false, error: `relay ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' };
  }
}

/** Pull the latest state for a code. Never throws. */
export async function fetchLatest(
  cfg: RelayConfig,
  code: string,
): Promise<{ ok: boolean; payload?: SyncPayload; error?: string }> {
  if (!cfg.enabled || !cfg.url) return { ok: false, error: 'sync disabled' };
  try {
    const res = await fetch(`${cfg.url}?code=${encodeURIComponent(code)}`);
    if (!res.ok) return { ok: false, error: `relay ${res.status}` };
    return { ok: true, payload: (await res.json()) as SyncPayload };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' };
  }
}
