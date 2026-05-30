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

export interface SceneStar {
  x: number;
  y: number;
  r: number;
  opacity: number;
}

export interface Scene {
  size: number;
  nodes: SceneNode[];
  edges: SceneEdge[];
  stars: SceneStar[];
  webTraits: string[];
}

function effectiveTraits(unit: UnitState, champion: Champion): Set<string> {
  return new Set([...champion.traits, ...unit.emblems]);
}

function sharedTraits(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((t) => b.has(t)).sort();
}

// Greedy ring ordering: chain each unit after the one it shares the most
// traits with, which keeps most edges between ring neighbours.
function orderUnits(units: UnitState[], traitSets: Set<string>[]): number[] {
  const n = units.length;
  if (n <= 2) return units.map((_, i) => i);

  const shared = units.map((_, i) =>
    units.map((_, j) => (i === j ? 0 : sharedTraits(traitSets[i], traitSets[j]).length)),
  );
  const totals = shared.map((row) => row.reduce((sum, v) => sum + v, 0));

  const start = totals.indexOf(Math.max(...totals));
  const order = [start];
  const remaining = new Set(units.map((_, i) => i));
  remaining.delete(start);

  while (remaining.size > 0) {
    const last = order[order.length - 1];
    let best = -1;
    for (const i of remaining) {
      if (
        best === -1 ||
        shared[last][i] > shared[last][best] ||
        (shared[last][i] === shared[last][best] && totals[i] > totals[best])
      ) {
        best = i;
      }
    }
    order.push(best);
    remaining.delete(best);
  }
  return order;
}

function pointOnEdge(edge: Pick<SceneEdge, 'p0' | 'p1' | 'control'>, t: number): Pt {
  const { p0, p1, control } = edge;
  if (!control) {
    return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
  }
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * control.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * control.y + t * t * p1.y,
  };
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Slide the badge along its own edge until it clears other badges and node
// zones; if nothing clears, settle for the least-crowded spot on the edge.
function placeBadge(
  edge: Pick<SceneEdge, 'p0' | 'p1' | 'control'>,
  placedBadges: Pt[],
  nodes: Pt[],
): Pt {
  const candidates: number[] = [0.5];
  for (let step = BADGE_T_STEP; step <= BADGE_T_MAX_OFFSET + 1e-9; step += BADGE_T_STEP) {
    candidates.push(0.5 + step, 0.5 - step);
  }
