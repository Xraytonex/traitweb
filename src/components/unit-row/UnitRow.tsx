import { useState } from 'react';
import { costColor, FALLBACK_TRAIT_COLOR, type TraitColor } from '../../lib/color';
import type { Champion, Trait, UnitState } from '../../lib/types';
import './unit-row.css';

interface UnitRowProps {
  units: UnitState[];
  championsByApiName: Map<string, Champion>;
  traitsByName: Map<string, Trait>;
  traitColors: Map<string, TraitColor>;
  onOpenPicker: (apiName: string) => void;
  onRemoveUnit: (apiName: string) => void;
  onRemoveEmblem: (apiName: string, trait: string) => void;
}

export function UnitRow({
  units,
  championsByApiName,
  traitsByName,
  traitColors,
  onOpenPicker,
  onRemoveUnit,
  onRemoveEmblem,
}: UnitRowProps) {
  const [failedIcons, setFailedIcons] = useState<ReadonlySet<string>>(new Set());
