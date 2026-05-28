import type { Trait } from './types';

const GOLDEN_ANGLE = 137.508;
const SATURATION = 0.72;
const LIGHTNESS = 0.58;

export interface TraitColor {
  line: string;
  dark: string;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

// Golden-angle hue steps keep alphabetically adjacent traits far apart in hue.
export function buildTraitColors(traits: Trait[]): Map<string, TraitColor> {
  const colors = new Map<string, TraitColor>();
  traits.forEach((trait, i) => {
    const hue = (i * GOLDEN_ANGLE) % 360;
    const [r, g, b] = hslToRgb(hue, SATURATION, LIGHTNESS);
    colors.set(trait.name, {
      line: `rgb(${r}, ${g}, ${b})`,
      dark: `rgb(${Math.round(r * 0.35)}, ${Math.round(g * 0.35)}, ${Math.round(b * 0.35)})`,
    });
  });
  return colors;
}

export const FALLBACK_TRAIT_COLOR: TraitColor = {
  line: 'rgb(150, 150, 160)',
  dark: 'rgb(52, 52, 56)',
};

export const COST_COLORS: Record<number, string> = {
  1: '#9aa4af',
  2: '#3faa5f',
  3: '#3f8fd4',
  4: '#b64ad6',
  5: '#d4af37',
};

export function costColor(cost: number): string {
  return COST_COLORS[cost] ?? COST_COLORS[1];
}
