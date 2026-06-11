import type { SetData, UnitState } from './types';
import { EMBLEM_LIMIT } from '../config';

// Board state lives in the hash as #s=<base64url [[apiName, [emblem, ...]], ...]>.

type Encoded = Array<[string, string[]]>;

export function encodeStateToHash(units: UnitState[]): string {
  if (units.length === 0) return '';
  const payload: Encoded = units.map((u) => [u.apiName, u.emblems]);
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `#s=${b64}`;
}

export function decodeStateFromHash(hash: string, data: SetData): UnitState[] | null {
  const match = /^#s=([A-Za-z0-9\-_]+)$/.exec(hash);
  if (!match) return null;
  try {
    const b64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    const payload = JSON.parse(json) as Encoded;
    if (!Array.isArray(payload)) return null;

    const validChampions = new Set(data.champions.map((c) => c.apiName));
    const validTraits = new Set(data.traits.map((t) => t.name));
    const units: UnitState[] = [];
    for (const entry of payload) {
      if (!Array.isArray(entry) || typeof entry[0] !== 'string') continue;
      const [apiName, emblems] = entry;
      if (!validChampions.has(apiName)) continue;
      if (units.some((u) => u.apiName === apiName)) continue;
      const cleanEmblems = Array.isArray(emblems)
        ? emblems
            .filter((e): e is string => typeof e === 'string' && validTraits.has(e))
            .slice(0, EMBLEM_LIMIT)
        : [];
      units.push({ apiName, emblems: cleanEmblems });
    }
    return units.length > 0 ? units : null;
  } catch {
    return null;
  }
}
