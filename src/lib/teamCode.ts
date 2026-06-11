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

  const codeSet = Number(suffix[1]);
  if (codeSet !== data.setNumber) {
    return {
      units: [],
      failedChunks: [],
      error: `This code is for Set ${codeSet}, but this app supports Set ${data.setNumber}.`,
    };
  }

  const body = compact.slice(0, suffix.index);
  if (body.length <= VERSION_LENGTH) {
    return { units: [], failedChunks: [], error: 'Team code is too short to contain any units.' };
  }

  const payload = body.slice(VERSION_LENGTH);
  const chunks = payload.match(new RegExp(`.{1,${CHUNK_LENGTH}}`, 'g')) ?? [];

  const units: string[] = [];
  const failedChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk === EMPTY_SLOT) continue;
    const code = chunk.length === CHUNK_LENGTH ? parseInt(chunk, 16) : NaN;
    const apiName = Number.isNaN(code) ? undefined : data.plannerMap[String(code)];
    if (!apiName) {
      failedChunks.push(chunk);
      continue;
    }
    if (!units.includes(apiName) && units.length < MAX_UNITS) {
      units.push(apiName);
    }
  }

  if (units.length === 0) {
    return {
      units,
      failedChunks,
      error: 'No units could be resolved from that code.',
    };
  }
  return { units, failedChunks };
}
