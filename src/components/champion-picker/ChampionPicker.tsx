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

  return (
    <details className="champion-picker">
      <summary>Or pick champions manually</summary>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search champions…"
        aria-label="Search champions"
      />
      {atCap && <p className="warn-text">Board is full ({MAX_UNITS} units).</p>}
      <ul className="champion-grid">
        {matches.map((champion) => {
          const picked = pickedApiNames.has(champion.apiName);
          return (
            <li key={champion.apiName}>
              <button
                type="button"
                className="champion-cell"
                disabled={picked || atCap}
                onClick={() => onAdd(champion.apiName)}
                title={`${champion.name} (${champion.cost} cost) — ${champion.traits.join(', ')}`}
              >
                {failedIcons.has(champion.icon) ? (
                  <span
                    className="champion-icon champion-icon-fallback"
                    style={{ background: costColor(champion.cost) }}
                    aria-hidden="true"
                  />
                ) : (
                  <img
                    className="champion-icon"
                    src={champion.icon}
                    alt=""
                    loading="lazy"
                    width={44}
                    height={44}
                    style={{ borderColor: costColor(champion.cost) }}
                    onError={() =>
                      setFailedIcons((prev) => new Set(prev).add(champion.icon))
                    }
                  />
                )}
                <span className="champion-name">{champion.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
