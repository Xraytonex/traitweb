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

  return (
    <div className="trait-picker-overlay" onClick={onClose} role="presentation">
      <div
        className="trait-picker"
        role="dialog"
        aria-modal="true"
        aria-label={`Assign emblems to ${champion.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="trait-picker-header">
          <h2>Emblems for {champion.name}</h2>
          <button type="button" className="trait-picker-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        {atCap && (
          <p className="warn-text">
            Units hold at most {EMBLEM_LIMIT} emblems — remove one to swap.
          </p>
        )}
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search traits…"
          aria-label="Search traits"
          autoFocus
        />
        <ul className="trait-list">
          {matches.map((trait) => {
            const isNative = nativeTraits.has(trait.name);
            const isAttached = attached.has(trait.name);
            const color = traitColors.get(trait.name) ?? FALLBACK_TRAIT_COLOR;
            return (
              <li key={trait.apiName}>
                <button
                  type="button"
                  className={`trait-option${isAttached ? ' is-attached' : ''}`}
                  disabled={isNative || (atCap && !isAttached)}
                  onClick={() => onToggle(trait.name)}
                >
                  <span
                    className="trait-badge"
                    style={{ background: color.dark, borderColor: color.line }}
                  >
                    <img src={trait.icon} alt="" width={18} height={18} loading="lazy" />
                  </span>
                  <span className="trait-option-name">{trait.name}</span>
                  {isNative && <span className="trait-tag">native</span>}
                  {isAttached && <span className="trait-tag trait-tag-on">added ✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
