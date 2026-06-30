export type SpeedMode = 'instant' | 'progressive';

/** Convertit un niveau 1..10 en millisecondes par carte (10 = le plus rapide). */
export function msPerCard(level: number): number {
  return Math.round(720 - level * 64); // niveau 1 ≈ 656ms, niveau 10 = 80ms
}

export function DealSpeedControl({
  mode,
  level,
  onMode,
  onLevel,
}: {
  mode: SpeedMode;
  level: number;
  onMode: (m: SpeedMode) => void;
  onLevel: (l: number) => void;
}) {
  return (
    <div className="speed-ctl">
      <div className="seg-toggle">
        <button className={mode === 'instant' ? 'active' : ''} onClick={() => onMode('instant')}>
          ⚡ Instantané
        </button>
        <button
          className={mode === 'progressive' ? 'active' : ''}
          onClick={() => onMode('progressive')}
        >
          🂠 Progressif
        </button>
      </div>

      <div className={`speed-slider ${mode === 'instant' ? 'disabled' : ''}`}>
        <span className="speed-lbl">Lent</span>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={level}
          disabled={mode === 'instant'}
          onChange={(e) => onLevel(Number(e.target.value))}
          title={`${msPerCard(level)} ms / carte`}
        />
        <span className="speed-lbl">Rapide</span>
      </div>
    </div>
  );
}
