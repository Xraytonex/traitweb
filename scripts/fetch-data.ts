import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SET_NUMBER } from '../src/config.ts';

const CDRAGON = 'https://raw.communitydragon.org/latest';
const TFT_DATA_URL = `${CDRAGON}/cdragon/tft/en_us.json`;
const PLANNER_URL = `${CDRAGON}/plugins/rcp-be-lol-game-data/global/default/v1/tftchampions-teamplanner.json`;

function iconUrl(assetPath: string): string {
  return `${CDRAGON}/game/${assetPath.toLowerCase().replace(/\.(tex|dds)$/, '.png')}`;
}

interface RawChampion {
  apiName: string;
  name: string;
  cost: number;
  traits: string[];
  tileIcon: string | null;
}

interface RawTrait {
  apiName: string;
  name: string;
  icon: string | null;
}

interface RawItem {
  apiName: string | null;
  name: string | null;
}

interface PlannerEntry {
  character_id: string;
  team_planner_code: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json() as Promise<T>;
}

async function main() {
  console.log(`Fetching TFT data for Set ${SET_NUMBER}...`);
  const setKey = String(SET_NUMBER);
  const setPrefix = `TFT${SET_NUMBER}_`;

  const tft = await fetchJson<{
    items: RawItem[];
    sets: Record<string, { champions: RawChampion[]; traits: RawTrait[] }>;
  }>(TFT_DATA_URL);

  const set = tft.sets[setKey];
  if (!set) {
    throw new Error(
      `Set "${setKey}" not found in ${TFT_DATA_URL}. Available: ${Object.keys(tft.sets).join(', ')}`,
    );
  }

  const champions = set.champions
    .filter(
      (c) =>
        c.traits.length > 0 &&
        !c.apiName.startsWith(`${setPrefix}Enemy_`) &&
        c.tileIcon != null,
    )
    .map((c) => ({
      apiName: c.apiName,
      name: c.name,
      cost: c.cost,
      traits: c.traits,
      icon: iconUrl(c.tileIcon as string),
    }))
    .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));

  // Emblem items carry no associatedTraits in current data; match on the
  // "<Trait> Emblem" item name instead.
  const EMBLEM_SUFFIX = ' Emblem';
  const emblemTraitNames = new Set<string>();
  for (const item of tft.items ?? []) {
    if (
      item.apiName?.startsWith(`TFT${SET_NUMBER}_Item_`) &&
      item.apiName.endsWith('EmblemItem') &&
      item.name?.endsWith(EMBLEM_SUFFIX)
    ) {
      emblemTraitNames.add(item.name.slice(0, -EMBLEM_SUFFIX.length));
    }
  }
