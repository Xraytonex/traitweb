import { useState, type FormEvent } from 'react';
import { parseTeamCode, type ParsedTeamCode } from '../../lib/teamCode';
import type { SetData } from '../../lib/types';
import './code-input.css';

interface CodeInputProps {
  data: SetData;
  onLoad: (apiNames: string[]) => void;
}

export function CodeInput({ data, onLoad }: CodeInputProps) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<ParsedTeamCode | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseTeamCode(value, data);
    setResult(parsed);
    if (parsed.units.length > 0) {
      onLoad(parsed.units);
    }
  };

  return (
    <form className="code-input" onSubmit={handleSubmit}>
      <label className="code-input-label" htmlFor="team-code">
        In-game team code
      </label>
      <div className="code-input-row">
        <input
          id="team-code"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={`02…TFTSet${data.setNumber} — from the in-game team planner's "Copy Team Code"`}
          spellCheck={false}
          autoComplete="off"
        />
        <button type="submit" className="btn btn-primary">
          Load team
        </button>
      </div>
      {result?.error && <p className="error-text">{result.error}</p>}
      {!result?.error && result && result.failedChunks.length > 0 && (
        <p className="warn-text">
          Couldn’t resolve chunk{result.failedChunks.length > 1 ? 's' : ''}{' '}
          {result.failedChunks.map((c) => `“${c}”`).join(', ')} — loaded the {result.units.length}{' '}
          unit{result.units.length > 1 ? 's' : ''} that parsed.
        </p>
      )}
      {!result?.error && result && result.failedChunks.length === 0 && result.units.length > 0 && (
        <p className="hint-text">
          Loaded {result.units.length} unit{result.units.length > 1 ? 's' : ''}.
        </p>
      )}
    </form>
  );
}
