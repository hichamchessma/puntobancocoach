import type { AntiCfg, AntiSide } from '../engine/antiStrat';

function AntiCard({
  title,
  icon,
  cls,
  n2sig,
  n1sig,
  s,
  on,
}: {
  title: string;
  icon: string;
  cls: string;
  n2sig: string;
  n1sig: string;
  s: AntiSide;
  on: (patch: Partial<AntiSide>) => void;
}) {
  const setLvl = (key: 'levelsN2' | 'levelsN1', i: number, v: number) =>
    on({ [key]: s[key].map((x, j) => (j === i ? Math.max(0, v) : x)) } as Partial<AntiSide>);

  return (
    <div className={`venge-box ${s.enabled ? cls : ''}`}>
      <label className="toggle" style={{ color: 'var(--text)' }}>
        <input type="checkbox" checked={s.enabled} onChange={() => on({ enabled: !s.enabled })} />
        {icon} <strong>{title}</strong>
      </label>
      <div style={{ opacity: s.enabled ? 1 : 0.45 }}>
        <label className="toggle niv-toggle" style={{ marginTop: 8 }}>
          <input type="checkbox" checked={s.useN2} disabled={!s.enabled} onChange={() => on({ useN2: !s.useN2 })} />
          <span className="niv-lbl">Niveau 2 (doux) · {n2sig} · 3 paliers</span>
        </label>
        <div className="stakes-row" style={{ opacity: s.useN2 ? 1 : 0.4 }}>
          {s.levelsN2.map((v, i) => (
            <div key={i} className="stake-field">
              <span className={`stake-idx st${i + 1}`}>P{i + 1}</span>
              <input type="number" min={0} step={10} value={v} disabled={!s.enabled || !s.useN2} onChange={(e) => setLvl('levelsN2', i, Number(e.target.value))} />
            </div>
          ))}
        </div>
        <label className="toggle niv-toggle" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={s.useN1} disabled={!s.enabled} onChange={() => on({ useN1: !s.useN1 })} />
          <span className="niv-lbl">Niveau 1 (agressif) · {n1sig} · 4 paliers</span>
        </label>
        <div className="stakes-row" style={{ opacity: s.useN1 ? 1 : 0.4 }}>
          {s.levelsN1.map((v, i) => (
            <div key={i} className="stake-field">
              <span className={`stake-idx venge st${i + 1}`}>P{i + 1}</span>
              <input type="number" min={0} step={10} value={v} disabled={!s.enabled || !s.useN1} onChange={(e) => setLvl('levelsN1', i, Number(e.target.value))} />
            </div>
          ))}
        </div>
        <div className="btn-row" style={{ marginTop: 8, gap: 12 }}>
          <div className="field inline" title="Actif seulement si les 2 niveaux sont cochés : après une perte totale, on passe niv.1 pour N cycles">
            <label>🔥 Vengeance (cycles)</label>
            <input type="number" min={0} max={20} value={s.vengeance} disabled={!s.enabled || !s.useN2 || !s.useN1} onChange={(e) => on({ vengeance: Math.max(0, Number(e.target.value)) })} />
          </div>
          <div className="field inline">
            <label>Suivi (flat)</label>
            <input type="number" min={0} step={10} value={s.follow} disabled={!s.enabled} onChange={(e) => on({ follow: Math.max(0, Number(e.target.value)) })} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Éditeur contrôlé de la config anti (2 cartes : anti-zigzag, anti-dragon). */
export function AntiConfigEditor({ value, onChange }: { value: AntiCfg; onChange: (c: AntiCfg) => void }) {
  return (
    <div className="tend-row">
      <AntiCard
        title="Anti-zigzag" icon="🏓" cls="on-zig" n2sig="2 changements" n1sig="1 changement"
        s={value.antiZig} on={(p) => onChange({ ...value, antiZig: { ...value.antiZig, ...p } })}
      />
      <AntiCard
        title="Anti-dragon" icon="🐉" cls="on-drag" n2sig="triple" n1sig="double"
        s={value.antiDrag} on={(p) => onChange({ ...value, antiDrag: { ...value.antiDrag, ...p } })}
      />
    </div>
  );
}
