import { useState } from 'react';
import { fuzzyFilter } from '../../lib/fuzzy';
import { costColor } from '../../lib/color';
import { MAX_UNITS } from '../../config';
import type { Champion } from '../../lib/types';
import './champion-picker.css';

interface ChampionPickerProps {
  champions: Champion[];
  pickedApiNames: ReadonlySet<string>;
  onAdd: (apiName: string) => void;
}

export function ChampionPicker({ champions, pickedApiNames, onAdd }: ChampionPickerProps) {
  const [query, setQuery] = useState('');
  const [failedIcons, setFailedIcons] = useState<ReadonlySet<string>>(new Set());
  const matches = fuzzyFilter(query, champions, (c) => c.name);
  const atCap = pickedApiNames.size >= MAX_UNITS;
