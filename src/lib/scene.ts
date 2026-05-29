import type { Champion, UnitState } from './types';
import { mulberry32 } from './random';

export const CANVAS_SIZE = 1100;
export const NODE_DIAMETER = 100;
export const LINE_WIDTH = 3.5;
export const EDGE_OPACITY = 0.85;
export const BADGE_DIAMETER = 39;
export const BADGE_GLYPH_RATIO = 0.62;

const RING_RADIUS = 460;
const PARALLEL_SPACING = 26;
const BOW_FACTOR = 0.13;
const STAR_COUNT = 900;
const STAR_SEED = 0x17c0de;
const BADGE_MIN_GAP = 1.15 * BADGE_DIAMETER;
const NODE_CLEARANCE = 0.9 * NODE_DIAMETER;
const BADGE_T_STEP = 0.04;
const BADGE_T_MAX_OFFSET = 0.24;

export interface Pt {
  x: number;
  y: number;
}

export interface SceneNode {
  x: number;
  y: number;
  unit: UnitState;
  champion: Champion;
}

export interface SceneEdge {
  p0: Pt;
  p1: Pt;
  control: Pt | null;
  trait: string;
  badge: Pt;
}
