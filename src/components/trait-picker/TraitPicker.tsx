import { useEffect, useState } from 'react';
import { fuzzyFilter } from '../../lib/fuzzy';
import { FALLBACK_TRAIT_COLOR, type TraitColor } from '../../lib/color';
import { EMBLEM_LIMIT } from '../../config';
import type { Champion, Trait, UnitState } from '../../lib/types';
import './trait-picker.css';

interface TraitPickerProps {
  champion: Champion;
  unit: UnitState;
  traits: Trait[];
  traitColors: Map<string, TraitColor>;
  onToggle: (trait: string) => void;
  onClose: () => void;
}

export function TraitPicker({
  champion,
  unit,
  traits,
  traitColors,
  onToggle,
  onClose,
}: TraitPickerProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const nativeTraits = new Set(champion.traits);
  const attached = new Set(unit.emblems);
  const atCap = unit.emblems.length >= EMBLEM_LIMIT;
  const emblemTraits = traits.filter((t) => t.hasEmblem);
  const matches = fuzzyFilter(query, emblemTraits, (t) => t.name);
