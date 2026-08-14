import { useState } from 'react';
import type { AntiCfg, AntiSide } from '../engine/antiStrat';

function useAntiSide(base: number, cur: AntiSide | undefined, n2sig: string, n1sig: string) {
  const [enabled, setEnabled] = useState(cur?.enabled ?? true);
  const [n2, setN2] = useState<number[]>(cur?.levelsN2 ?? [base, base * 2, base * 4]);
  const [n1, setN1] = useState<number[]>(cur?.levelsN1 ?? [base, base * 2, base * 4, base * 8]);
  const [ven, setVen] = useState(cur?.vengeance ?? 3);
  const [follow, setFollow] = useState(cur?.follow ?? base);
  const set = (arr: number[], setter: (a: number[]) => void, i: number, v: number) =>
    setter(arr.map((x, j) => (j === i ? Math.max(0, v) : x)));
  return {
    enabled, setEnabled, n2, setN2, n1, setN1, ven, setVen, follow, setFollow, set, n2sig, n1sig,
    value: (): AntiSide => ({
      enabled,
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
        <div className="hint" style={{ marginTop: 6 }}>Niveau 2 (départ doux) · {s.n2sig} · 3 paliers</div>
        <div className="stakes-row">
          {s.n2.map((v, i) => (
            <div key={i} className="stake-field">
              <span className={`stake-idx st${i + 1}`}>P{i + 1}</span>
              <input type="number" min={0} step={10} value={v} disabled={!s.enabled} onChange={(e) => s.set(s.n2, s.setN2, i, Number(e.target.value))} />
            </div>
          ))}
        </div>
        <div className="hint" style={{ marginTop: 8 }}>Niveau 1 (vengeance) · {s.n1sig} · 4 paliers</div>
        <div className="stakes-row">
          {s.n1.map((v, i) => (
            <div key={i} className="stake-field">
              <span className={`stake-idx venge st${i + 1}`}>P{i + 1}</span>
              <input type="number" min={0} step={10} value={v} disabled={!s.enabled} onChange={(e) => s.set(s.n1, s.setN1, i, Number(e.target.value))} />
            </div>
          ))}
        </div>
        <div className="btn-row" style={{ marginTop: 8, gap: 12 }}>
          <div className="field inline">
            <label>🔥 Vengeance (cycles)</label>
            <input type="number" min={0} max={20} value={s.ven} disabled={!s.enabled} onChange={(e) => s.setVen(Number(e.target.value))} />
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
          (dédoublement, même couleur) ; Anti-dragon mise que la série casse (couleur opposée). On
          démarre en niveau 2 (doux) ; après une perte totale, le niveau 1 (vengeance) s'active pour
          N cycles. Si tous les paliers perdent, on suit la tendance à plat jusqu'à ce qu'elle casse.
          Priorité anti-zigzag &gt; anti-dragon.
        </p>

        <div className="tend-row">
          <AntiCard title="Anti-zigzag" icon="🏓" cls="on-zig" s={zig} />
          <AntiCard title="Anti-dragon" icon="🐉" cls="on-drag" s={drag} />
        </div>

        <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn gold" disabled={!zig.enabled && !drag.enabled} onClick={apply}>
            ▶ Activer la strat anti
          </button>
        </div>
      </div>
    </div>
  );
}
