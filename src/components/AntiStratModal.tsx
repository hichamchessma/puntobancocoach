import { useState } from 'react';
import type { AntiCfg, AntiSide } from '../engine/antiStrat';

function useAntiSide(base: number, cur: AntiSide | undefined, n2sig: string, n1sig: string) {
  const [enabled, setEnabled] = useState(cur?.enabled ?? true);
  const [useN2, setUseN2] = useState(cur?.useN2 ?? true);
  const [useN1, setUseN1] = useState(cur?.useN1 ?? true);
  const [n2, setN2] = useState<number[]>(cur?.levelsN2 ?? [base, base * 2, base * 4]);
  const [n1, setN1] = useState<number[]>(cur?.levelsN1 ?? [base * 1.5, base * 3, base * 6, base * 12]);
  const [ven, setVen] = useState(cur?.vengeance ?? 4);
  const [follow, setFollow] = useState(cur?.follow ?? base);
  const set = (arr: number[], setter: (a: number[]) => void, i: number, v: number) =>
    setter(arr.map((x, j) => (j === i ? Math.max(0, v) : x)));
  return {
    enabled, setEnabled, useN2, setUseN2, useN1, setUseN1, n2, setN2, n1, setN1, ven, setVen, follow, setFollow, set, n2sig, n1sig,
    value: (): AntiSide => ({
      enabled,
      useN2,
      useN1,
      levelsN2: n2.map((x) => Math.max(0, x)),
      levelsN1: n1.map((x) => Math.max(0, x)),
      vengeance: Math.max(0, ven),
      follow: Math.max(0, follow),
    }),
  };
}

function AntiCard({
  title,
  icon,
  cls,
  s,
}: {
  title: string;
  icon: string;
  cls: string;
  s: ReturnType<typeof useAntiSide>;
}) {
  return (
    <div className={`venge-box ${s.enabled ? cls : ''}`}>
      <label className="toggle" style={{ color: 'var(--text)' }}>
        <input type="checkbox" checked={s.enabled} onChange={() => s.setEnabled((v) => !v)} />
        {icon} <strong>{title}</strong>
      </label>
      <div style={{ opacity: s.enabled ? 1 : 0.45 }}>
        <label className="toggle niv-toggle" style={{ marginTop: 8 }}>
          <input type="checkbox" checked={s.useN2} disabled={!s.enabled} onChange={() => s.setUseN2((v) => !v)} />
          <span className="niv-lbl">Niveau 2 (doux) · {s.n2sig} · 3 paliers</span>
        </label>
        <div className="stakes-row" style={{ opacity: s.useN2 ? 1 : 0.4 }}>
          {s.n2.map((v, i) => (
            <div key={i} className="stake-field">
              <span className={`stake-idx st${i + 1}`}>P{i + 1}</span>
              <input type="number" min={0} step={10} value={v} disabled={!s.enabled || !s.useN2} onChange={(e) => s.set(s.n2, s.setN2, i, Number(e.target.value))} />
            </div>
          ))}
        </div>
        <label className="toggle niv-toggle" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={s.useN1} disabled={!s.enabled} onChange={() => s.setUseN1((v) => !v)} />
          <span className="niv-lbl">Niveau 1 (agressif) · {s.n1sig} · 4 paliers</span>
        </label>
        <div className="stakes-row" style={{ opacity: s.useN1 ? 1 : 0.4 }}>
          {s.n1.map((v, i) => (
            <div key={i} className="stake-field">
              <span className={`stake-idx venge st${i + 1}`}>P{i + 1}</span>
              <input type="number" min={0} step={10} value={v} disabled={!s.enabled || !s.useN1} onChange={(e) => s.set(s.n1, s.setN1, i, Number(e.target.value))} />
            </div>
          ))}
        </div>
        <div className="btn-row" style={{ marginTop: 8, gap: 12 }}>
          <div className="field inline" title="Actif seulement si les 2 niveaux sont cochés : après une perte totale, on passe niv.1 pour N cycles">
            <label>🔥 Vengeance (cycles)</label>
            <input type="number" min={0} max={20} value={s.ven} disabled={!s.enabled || !s.useN2 || !s.useN1} onChange={(e) => s.setVen(Number(e.target.value))} />
          </div>
          <div className="field inline">
            <label>Suivi (flat)</label>
            <input type="number" min={0} step={10} value={s.follow} disabled={!s.enabled} onChange={(e) => s.setFollow(Number(e.target.value))} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AntiStratModal({
  baseUnit,
  current,
  onApply,
  onClose,
}: {
  baseUnit: number;
  current: AntiCfg | null;
  onApply: (cfg: AntiCfg) => void;
  onClose: () => void;
}) {
  const zig = useAntiSide(baseUnit, current?.antiZig, '2 changements', '1 changement');
  const drag = useAntiSide(baseUnit, current?.antiDrag, 'triple', 'double');

  const apply = () => onApply({ antiZig: zig.value(), antiDrag: drag.value() });

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="coach-modal" style={{ width: 'min(760px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="coach-head">
          <span className="coach-kicker">⚔️ STRAT ANTI</span>
          <button className="btn" onClick={onClose}>Fermer</button>
        </div>
        <p className="coach-text" style={{ marginTop: 0 }}>
          On parie <strong>contre</strong> la tendance : Anti-zigzag mise que le zigzag va s'arrêter
          (dédoublement, même couleur) ; Anti-dragon mise que la série casse (couleur opposée).
          <strong> Ultra-flex</strong> : coche le niveau 2, le niveau 1, ou les deux. Les deux = strat
          complète (départ niv.2, puis niv.1 en vengeance N cycles après une perte totale). Un seul =
          on ne joue que ce niveau-là. Après tous paliers perdus, on suit la tendance à plat jusqu'à
          la casse. Priorité anti-zigzag &gt; anti-dragon.
        </p>

        <div className="tend-row">
          <AntiCard title="Anti-zigzag" icon="🏓" cls="on-zig" s={zig} />
          <AntiCard title="Anti-dragon" icon="🐉" cls="on-drag" s={drag} />
        </div>

        <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button
            className="btn gold"
            disabled={!(zig.enabled && (zig.useN1 || zig.useN2)) && !(drag.enabled && (drag.useN1 || drag.useN2))}
            onClick={apply}
          >
            ▶ Activer la strat anti
          </button>
        </div>
      </div>
    </div>
  );
}
