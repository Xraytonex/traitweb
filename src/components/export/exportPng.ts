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

const EXPORT_SCALE = 2;
const BG_COLOR = '#0a0c18';
const GLOW_COLOR = 'rgba(28, 32, 60, 0.85)';
const NODE_RING_GOLD = '#d4af6e';
const NODE_RING_OUTER = '#6e5527';

// crossOrigin keeps the canvas untainted so toBlob works on hotlinked icons.
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function traceEdge(ctx: CanvasRenderingContext2D, edge: SceneEdge) {
  ctx.beginPath();
  ctx.moveTo(edge.p0.x, edge.p0.y);
  if (edge.control) {
    ctx.quadraticCurveTo(edge.control.x, edge.control.y, edge.p1.x, edge.p1.y);
  } else {
    ctx.lineTo(edge.p1.x, edge.p1.y);
  }
  ctx.stroke();
}

export async function renderSceneToCanvas(
  scene: Scene,
  traitColors: Map<string, TraitColor>,
  traitsByName: Map<string, Trait>,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = scene.size * EXPORT_SCALE;
  canvas.height = scene.size * EXPORT_SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.scale(EXPORT_SCALE, EXPORT_SCALE);

  const urls = new Set<string>();
  for (const node of scene.nodes) urls.add(node.champion.icon);
  for (const name of scene.webTraits) {
    const trait = traitsByName.get(name);
    if (trait) urls.add(trait.icon);
  }
  const images = new Map<string, HTMLImageElement | null>();
  await Promise.all(
    [...urls].map(async (url) => {
      images.set(url, await loadImage(url));
    }),
  );

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, scene.size, scene.size);
  const glow = ctx.createRadialGradient(
    scene.size / 2,
    scene.size / 2,
    0,
    scene.size / 2,
    scene.size / 2,
    scene.size * 0.55,
  );
  glow.addColorStop(0, GLOW_COLOR);
  glow.addColorStop(1, 'rgba(28, 32, 60, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, scene.size, scene.size);
  for (const star of scene.stars) {
    ctx.globalAlpha = star.opacity;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.lineWidth = LINE_WIDTH;
  ctx.globalAlpha = EDGE_OPACITY;
  for (const edge of scene.edges) {
    ctx.strokeStyle = (traitColors.get(edge.trait) ?? FALLBACK_TRAIT_COLOR).line;
    traceEdge(ctx, edge);
  }
  ctx.globalAlpha = 1;

  const badgeR = BADGE_DIAMETER / 2;
  const glyphSize = BADGE_DIAMETER * BADGE_GLYPH_RATIO;
  for (const edge of scene.edges) {
    const color = traitColors.get(edge.trait) ?? FALLBACK_TRAIT_COLOR;
    const { x, y } = edge.badge;
    ctx.fillStyle = color.dark;
    ctx.beginPath();
    ctx.arc(x, y, badgeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color.line;
    ctx.stroke();

    const trait = traitsByName.get(edge.trait);
    const glyph = trait ? images.get(trait.icon) : null;
    if (glyph) {
      ctx.drawImage(glyph, x - glyphSize / 2, y - glyphSize / 2, glyphSize, glyphSize);
    }
  }

  const nodeR = NODE_DIAMETER / 2;
  for (const node of scene.nodes) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const img = images.get(node.champion.icon);
    ctx.save();
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeR, 0, Math.PI * 2);
    ctx.clip();
    if (img) {
      ctx.drawImage(img, node.x - nodeR, node.y - nodeR, NODE_DIAMETER, NODE_DIAMETER);
    } else {
      ctx.fillStyle = costColor(node.champion.cost);
      ctx.fillRect(node.x - nodeR, node.y - nodeR, NODE_DIAMETER, NODE_DIAMETER);
    }
    ctx.restore();

    ctx.lineWidth = 3;
    ctx.strokeStyle = NODE_RING_GOLD;
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeR - 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = NODE_RING_OUTER;
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeR + 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  return canvas;
}

export async function downloadScenePng(
  scene: Scene,
  traitColors: Map<string, TraitColor>,
  traitsByName: Map<string, Trait>,
): Promise<void> {
  const canvas = await renderSceneToCanvas(scene, traitColors, traitsByName);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob) throw new Error('PNG encoding failed.');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'traitweb.png';
  link.click();
  URL.revokeObjectURL(url);
}
