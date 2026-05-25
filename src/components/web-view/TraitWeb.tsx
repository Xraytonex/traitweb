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

  const nodeR = NODE_DIAMETER / 2;
  const badgeR = BADGE_DIAMETER / 2;
  const glyphSize = BADGE_DIAMETER * BADGE_GLYPH_RATIO;

  return (
    <svg
      className="trait-web"
      viewBox={`0 0 ${scene.size} ${scene.size}`}
      role="img"
      aria-label="Trait web visualization"
    >
      <defs>
        <radialGradient id="tw-glow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#1c203c" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#1c203c" stopOpacity="0" />
        </radialGradient>
        <filter id="tw-node-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="11" />
        </filter>
        {scene.nodes.map((node, i) => (
          <clipPath id={`tw-clip-${i}`} key={node.unit.apiName}>
            <circle cx={node.x} cy={node.y} r={nodeR} />
          </clipPath>
        ))}
      </defs>

      <rect width={scene.size} height={scene.size} fill="#0a0c18" />
      <rect width={scene.size} height={scene.size} fill="url(#tw-glow)" />

      <g>
        {scene.stars.map((star, i) => (
          <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="#fff" opacity={star.opacity} />
        ))}
      </g>

      <g fill="none" strokeWidth={LINE_WIDTH} opacity={EDGE_OPACITY}>
        {scene.edges.map((edge, i) => (
          <path
            key={i}
            d={edgePath(edge)}
            stroke={(traitColors.get(edge.trait) ?? FALLBACK_TRAIT_COLOR).line}
          />
        ))}
      </g>

      <g>
        {scene.edges.map((edge, i) => {
          const color = traitColors.get(edge.trait) ?? FALLBACK_TRAIT_COLOR;
          const trait = traitsByName.get(edge.trait);
          const showGlyph = trait && !failedIcons.has(trait.icon);
          return (
            <g key={i}>
              <circle
                cx={edge.badge.x}
                cy={edge.badge.y}
                r={badgeR}
                fill={color.dark}
                stroke={color.line}
                strokeWidth={2}
              />
              {showGlyph && (
                <image
                  href={trait.icon}
                  x={edge.badge.x - glyphSize / 2}
                  y={edge.badge.y - glyphSize / 2}
                  width={glyphSize}
                  height={glyphSize}
                  onError={() => markFailed(trait.icon)}
                />
              )}
            </g>
          );
        })}
      </g>

      <g>
        {scene.nodes.map((node, i) => {
          const failed = failedIcons.has(node.champion.icon);
          return (
            <g key={node.unit.apiName}>
              <circle
                cx={node.x}
                cy={node.y}
                r={nodeR}
                fill="#000"
                opacity={0.9}
                filter="url(#tw-node-glow)"
              />
              {failed ? (
                <circle cx={node.x} cy={node.y} r={nodeR} fill={costColor(node.champion.cost)} />
              ) : (
                <image
                  href={node.champion.icon}
                  x={node.x - nodeR}
                  y={node.y - nodeR}
                  width={NODE_DIAMETER}
                  height={NODE_DIAMETER}
                  clipPath={`url(#tw-clip-${i})`}
                  preserveAspectRatio="xMidYMid slice"
                  onError={() => markFailed(node.champion.icon)}
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r={nodeR - 1.5}
                fill="none"
                stroke="#d4af6e"
                strokeWidth={3}
              />
              <circle
                cx={node.x}
                cy={node.y}
                r={nodeR + 1.5}
                fill="none"
                stroke="#6e5527"
                strokeWidth={2}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
