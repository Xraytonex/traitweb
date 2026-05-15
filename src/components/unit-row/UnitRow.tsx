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

  return (
    <ul className="unit-row" aria-label="Team units">
      {units.map((unit) => {
        const champion = championsByApiName.get(unit.apiName);
        if (!champion) return null;
        return (
          <li className="unit-card" key={unit.apiName}>
            <button
              type="button"
              className="unit-remove"
              onClick={() => onRemoveUnit(unit.apiName)}
              aria-label={`Remove ${champion.name}`}
            >
              ×
            </button>
            <button
              type="button"
              className="unit-icon-btn"
              onClick={() => onOpenPicker(unit.apiName)}
              title={`${champion.name} — click to assign emblems`}
              style={{ borderColor: costColor(champion.cost) }}
            >
              {failedIcons.has(champion.icon) ? (
                <span
                  className="unit-icon unit-icon-fallback"
                  style={{ background: costColor(champion.cost) }}
                  aria-hidden="true"
                />
              ) : (
                <img
                  className="unit-icon"
                  src={champion.icon}
                  alt={champion.name}
                  width={64}
                  height={64}
                  onError={() =>
                    setFailedIcons((prev) => new Set(prev).add(champion.icon))
                  }
                />
              )}
            </button>
            <span className="unit-name">{champion.name}</span>
            <div className="emblem-chips">
              {unit.emblems.map((emblem) => {
                const trait = traitsByName.get(emblem);
                const color = traitColors.get(emblem) ?? FALLBACK_TRAIT_COLOR;
                return (
                  <button
                    type="button"
                    key={emblem}
                    className="emblem-chip"
                    style={{ background: color.dark, borderColor: color.line }}
                    onClick={() => onRemoveEmblem(unit.apiName, emblem)}
                    title={`Remove ${emblem} emblem`}
                  >
                    {trait && <img src={trait.icon} alt={emblem} width={16} height={16} />}
                  </button>
                );
              })}
              <button
                type="button"
                className="emblem-add"
                onClick={() => onOpenPicker(unit.apiName)}
                aria-label={`Add emblem to ${champion.name}`}
              >
                +
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
