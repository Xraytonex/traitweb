import { useEffect, useMemo, useState } from 'react';
import rawData from './data/set-data.json';
import type { SetData, UnitState } from './lib/types';
import { buildScene } from './lib/scene';
import { buildTraitColors, FALLBACK_TRAIT_COLOR } from './lib/color';
import { decodeStateFromHash, encodeStateToHash } from './lib/urlState';
import { EMBLEM_LIMIT, MAX_UNITS } from './config';
import { CodeInput } from './components/code-input/CodeInput';
import { ChampionPicker } from './components/champion-picker/ChampionPicker';
import { UnitRow } from './components/unit-row/UnitRow';
import { TraitPicker } from './components/trait-picker/TraitPicker';
import { TraitWeb } from './components/web-view/TraitWeb';
import { downloadScenePng } from './components/export/exportPng';

const data = rawData as SetData;

export default function App() {
  const championsByApiName = useMemo(
    () => new Map(data.champions.map((c) => [c.apiName, c])),
    [],
  );
  const traitsByName = useMemo(() => new Map(data.traits.map((t) => [t.name, t])), []);
  const traitColors = useMemo(() => buildTraitColors(data.traits), []);

  const [units, setUnits] = useState<UnitState[]>(
    () => decodeStateFromHash(window.location.hash, data) ?? [],
  );
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const hash = encodeStateToHash(units);
    window.history.replaceState(
      null,
      '',
      hash || window.location.pathname + window.location.search,
    );
  }, [units]);

  const scene = useMemo(() => buildScene(units, championsByApiName), [units, championsByApiName]);

  const loadUnits = (apiNames: string[]) =>
    setUnits((prev) =>
      apiNames.map(
        (apiName) => prev.find((u) => u.apiName === apiName) ?? { apiName, emblems: [] },
      ),
    );

  const addUnit = (apiName: string) =>
    setUnits((prev) =>
      prev.length >= MAX_UNITS || prev.some((u) => u.apiName === apiName)
        ? prev
        : [...prev, { apiName, emblems: [] }],
    );

  const removeUnit = (apiName: string) => {
    setUnits((prev) => prev.filter((u) => u.apiName !== apiName));
    setPickerFor((open) => (open === apiName ? null : open));
  };

  const toggleEmblem = (apiName: string, trait: string) =>
    setUnits((prev) =>
      prev.map((u) =>
        u.apiName === apiName
          ? {
              ...u,
              emblems: u.emblems.includes(trait)
                ? u.emblems.filter((t) => t !== trait)
                : u.emblems.length >= EMBLEM_LIMIT
                  ? u.emblems
                  : [...u.emblems, trait],
            }
          : u,
      ),
    );

  const handleDownload = async () => {
    setExportError(null);
    try {
      await downloadScenePng(scene, traitColors, traitsByName);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'PNG export failed.');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setExportError('Couldn’t access the clipboard — copy the URL from the address bar.');
    }
  };

  const pickerUnit = pickerFor ? units.find((u) => u.apiName === pickerFor) : undefined;
  const pickerChampion = pickerFor ? championsByApiName.get(pickerFor) : undefined;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Traitweb</h1>
        <span className="app-set">Set {data.setNumber}</span>
      </header>

      <main className="app-main">
        <section className="panel" aria-label="Team input">
          <CodeInput data={data} onLoad={loadUnits} />
          <ChampionPicker
            champions={data.champions}
            pickedApiNames={new Set(units.map((u) => u.apiName))}
            onAdd={addUnit}
          />
        </section>

        {units.length > 0 && (
          <section className="panel" aria-label="Units and emblems">
            <UnitRow
              units={units}
              championsByApiName={championsByApiName}
              traitsByName={traitsByName}
              traitColors={traitColors}
              onOpenPicker={setPickerFor}
              onRemoveUnit={removeUnit}
              onRemoveEmblem={toggleEmblem}
            />
            <p className="hint-text">Click a unit to assign emblems; click a chip to remove it.</p>
          </section>
        )}

        <section className="panel" aria-label="Trait web">
          {units.length > 0 ? (
            <>
              <TraitWeb scene={scene} traitColors={traitColors} traitsByName={traitsByName} />
              {scene.edges.length === 0 && (
                <p className="hint-text" style={{ textAlign: 'center' }}>
                  No shared traits yet — add more units or attach emblems to weave the web.
                </p>
              )}
              {scene.webTraits.length > 0 && (
                <ul className="web-legend" aria-label="Traits in this web">
                  {scene.webTraits.map((name) => (
                    <li key={name}>
                      <span
                        className="legend-dot"
                        style={{
                          background: (traitColors.get(name) ?? FALLBACK_TRAIT_COLOR).line,
                        }}
                      />
                      {name}
                    </li>
                  ))}
                </ul>
              )}
              <div className="web-toolbar">
                <button type="button" className="btn btn-primary" onClick={handleDownload}>
                  Download PNG
                </button>
                <button type="button" className="btn" onClick={handleCopyLink}>
                  {linkCopied ? 'Link copied ✓' : 'Copy share link'}
                </button>
                <button type="button" className="btn" onClick={() => setUnits([])}>
                  Clear board
                </button>
              </div>
              {exportError && <p className="error-text">{exportError}</p>}
            </>
          ) : (
            <p className="hint-text">Load a team above to generate its trait web.</p>
          )}
        </section>
      </main>

      <footer className="hint-text">
        Data and icons from CommunityDragon. Traitweb isn’t endorsed by Riot Games. League of
        Legends and Teamfight Tactics are trademarks of Riot Games, Inc.
      </footer>

      {pickerUnit && pickerChampion && (
        <TraitPicker
          champion={pickerChampion}
          unit={pickerUnit}
          traits={data.traits}
          traitColors={traitColors}
          onToggle={(trait) => toggleEmblem(pickerUnit.apiName, trait)}
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  );
}
