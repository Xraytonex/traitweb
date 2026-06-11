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
