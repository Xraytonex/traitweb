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
