import type { SetData } from './types';
import { MAX_UNITS } from '../config';

export interface ParsedTeamCode {
  units: string[];
  failedChunks: string[];
  error?: string;
}

// Team code layout: 2-char version prefix, 3 hex digits per slot
// (000 = empty), then a TFTSet<N> suffix.
const SUFFIX_RE = /tftset(\d+)$/i;
const VERSION_LENGTH = 2;
const CHUNK_LENGTH = 3;
const EMPTY_SLOT = '000';

export function parseTeamCode(raw: string, data: SetData): ParsedTeamCode {
  const compact = raw.replace(/\s+/g, '');
  if (!compact) {
    return { units: [], failedChunks: [], error: 'Paste a team code first.' };
  }

  const suffix = SUFFIX_RE.exec(compact);
  if (!suffix) {
    return {
      units: [],
      failedChunks: [],
      error:
        'That doesn’t look like a team code — expected it to end with "TFTSet' +
        data.setNumber +
        '".',
    };
  }
