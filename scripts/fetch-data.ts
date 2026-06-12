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

  // Variant records (e.g. Stargazer_*) share a display name; keep the base one.
  const traitByName = new Map<string, RawTrait>();
  for (const t of set.traits) {
    if (t.icon == null) continue;
    const existing = traitByName.get(t.name);
    if (!existing || t.apiName.length < existing.apiName.length) {
      traitByName.set(t.name, t);
    }
  }
  const traits = [...traitByName.values()]
    .map((t) => ({
      apiName: t.apiName,
      name: t.name,
      icon: iconUrl(t.icon as string),
      hasEmblem: emblemTraitNames.has(t.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const planner = await fetchJson<Record<string, PlannerEntry[]>>(PLANNER_URL);
  const plannerSet = planner[`TFTSet${SET_NUMBER}`];
  if (!plannerSet) {
    throw new Error(
      `TFTSet${SET_NUMBER} not found in team planner data. Available: ${Object.keys(planner).join(', ')}`,
    );
  }

  const championNames = new Set(champions.map((c) => c.apiName));
  const plannerMap: Record<string, string> = {};
  for (const entry of plannerSet) {
    if (entry.team_planner_code > 0 && championNames.has(entry.character_id)) {
      plannerMap[String(entry.team_planner_code)] = entry.character_id;
    }
  }

  const mapped = Object.keys(plannerMap).length;
  if (mapped === 0) {
    throw new Error('Planner map is empty — planner data format may have changed.');
  }

  const out = { setNumber: SET_NUMBER, champions, traits, plannerMap };
  const dataDir = join(process.cwd(), 'src/data');
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, 'set-data.json'), JSON.stringify(out, null, 2));

  console.log(
    `Wrote src/data/set-data.json: ${champions.length} champions, ${traits.length} traits ` +
      `(${traits.filter((t) => t.hasEmblem).length} with emblems), ${mapped} planner codes.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
