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

  let bestPoint: Pt | null = null;
  let bestScore = -Infinity;
  for (const t of candidates) {
    const p = pointOnEdge(edge, t);
    const badgeClear = placedBadges.length
      ? Math.min(...placedBadges.map((b) => dist(p, b))) / BADGE_MIN_GAP
      : Infinity;
    const nodeClear = nodes.length
      ? Math.min(...nodes.map((nd) => dist(p, nd))) / NODE_CLEARANCE
      : Infinity;
    const score = Math.min(badgeClear, nodeClear);
    if (score >= 1) return p;
    if (score > bestScore) {
      bestScore = score;
      bestPoint = p;
    }
  }
  return bestPoint ?? pointOnEdge(edge, 0.5);
}

function buildStars(size: number): SceneStar[] {
  const rand = mulberry32(STAR_SEED);
  const stars: SceneStar[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: rand() * size,
      y: rand() * size,
      r: 0.25 + rand() * 0.95,
      opacity: 0.1 + rand() * 0.55,
    });
  }
  return stars;
}

export function buildScene(
  units: UnitState[],
  championsByApiName: Map<string, Champion>,
): Scene {
  const size = CANVAS_SIZE;
  const center: Pt = { x: size / 2, y: size / 2 };

  const resolved = units.filter((u) => championsByApiName.has(u.apiName));
  const champions = resolved.map((u) => championsByApiName.get(u.apiName) as Champion);
  const traitSets = resolved.map((u, i) => effectiveTraits(u, champions[i]));

  const order = orderUnits(resolved, traitSets);
  const n = order.length;

  const nodes: SceneNode[] = order.map((unitIdx, ringIdx) => {
    if (n === 1) {
      return { ...center, unit: resolved[unitIdx], champion: champions[unitIdx] };
    }
    const angle = -Math.PI / 2 + (ringIdx * 2 * Math.PI) / n;
    return {
      x: center.x + RING_RADIUS * Math.cos(angle),
      y: center.y + RING_RADIUS * Math.sin(angle),
      unit: resolved[unitIdx],
      champion: champions[unitIdx],
    };
  });
  const ringTraitSets = order.map((unitIdx) => traitSets[unitIdx]);

  const edges: SceneEdge[] = [];
  const webTraits = new Set<string>();

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const shared = sharedTraits(ringTraitSets[i], ringTraitSets[j]);
      if (shared.length === 0) continue;

      const a = nodes[i];
      const b = nodes[j];
      const chord = dist(a, b);
      if (chord === 0) continue;

      const dir = { x: (b.x - a.x) / chord, y: (b.y - a.y) / chord };
      let perp = { x: -dir.y, y: dir.x };
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (perp.x * (mid.x - center.x) + perp.y * (mid.y - center.y) < 0) {
        perp = { x: -perp.x, y: -perp.y };
      }

      const adjacent = n <= 2 || j - i === 1 || (i === 0 && j === n - 1);

      shared.forEach((trait, k) => {
        webTraits.add(trait);
        const offset = (k - (shared.length - 1) / 2) * PARALLEL_SPACING;
        const p0 = { x: a.x + perp.x * offset, y: a.y + perp.y * offset };
        const p1 = { x: b.x + perp.x * offset, y: b.y + perp.y * offset };
        const control = adjacent
          ? null
          : {
              x: mid.x + perp.x * (BOW_FACTOR * chord + offset),
              y: mid.y + perp.y * (BOW_FACTOR * chord + offset),
            };
        edges.push({ p0, p1, control, trait, badge: { x: 0, y: 0 } });
      });
    }
  }
