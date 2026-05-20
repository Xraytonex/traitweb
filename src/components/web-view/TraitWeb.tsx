import { useState } from 'react';
import {
  BADGE_DIAMETER,
  BADGE_GLYPH_RATIO,
  EDGE_OPACITY,
  LINE_WIDTH,
  NODE_DIAMETER,
  type Scene,
  type SceneEdge,
} from '../../lib/scene';
import { costColor, FALLBACK_TRAIT_COLOR, type TraitColor } from '../../lib/color';
import type { Trait } from '../../lib/types';
import './trait-web.css';

interface TraitWebProps {
  scene: Scene;
  traitColors: Map<string, TraitColor>;
  traitsByName: Map<string, Trait>;
}

function edgePath(edge: SceneEdge): string {
  const { p0, p1, control } = edge;
  return control
    ? `M ${p0.x} ${p0.y} Q ${control.x} ${control.y} ${p1.x} ${p1.y}`
    : `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`;
}

export function TraitWeb({ scene, traitColors, traitsByName }: TraitWebProps) {
  const [failedIcons, setFailedIcons] = useState<ReadonlySet<string>>(new Set());
  const markFailed = (url: string) =>
    setFailedIcons((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
