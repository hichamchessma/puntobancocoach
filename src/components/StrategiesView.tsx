import { useState } from 'react';
import { effectiveCap, stakeForStage } from '../engine/coach';
import { formatMoney } from '../engine/money';
import type { CoachConfig, Side } from '../engine/types';
import { CustomRuleEditor } from './CustomRuleEditor';
import { MiniRoad } from './MiniRoad';

const opp = (s: Side): Side => (s === 'B' ? 'P' : 'B');

export function StrategiesView({
  config,
  onSave,
}: {
  config: CoachConfig;
  onSave: (patch: Partial<CoachConfig>) => void;
}) {
  const [form, setForm] = useState({
    baseUnit: config.baseUnit,
    maxBet: config.maxBet,
    maxStages: config.maxStages,
    zigzagMinLen: config.zigzagMinLen,
    dragonMinLen: config.dragonMinLen,
    maxRiskPct: Math.round(config.maxRiskPct * 100),
  });
  const [playZigzag, setPlayZigzag] = useState(config.playZigzag);
  const [playDragon, setPlayDragon] = useState(config.playDragon);

  const num = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: Number(e.target.value) }));

  const preview: CoachConfig = {
    ...config,
    ...form,
    maxRiskPct: form.maxRiskPct / 100,
    playZigzag,
    playDragon,
  };
  const ladder = Array.from({ length: form.maxStages }, (_, i) => stakeForStage(i, preview));
  const m = (n: number) => formatMoney(n, config.currency);

  // séquences de démonstration (affichées comme dans le shoe)
  const zzSeq = Array.from({ length: form.zigzagMinLen }, (_, i) => (i % 2 === 0 ? 'B' : 'P') as Side);
  const zzBet = [{ side: opp(zzSeq[zzSeq.length - 1] ?? 'B'), amount: form.baseUnit }];
  const dgSeq = Array.from({ length: form.dragonMinLen }, () => 'B' as Side);
  const dgBet = [{ side: 'B' as Side, amount: form.baseUnit }];

  const save = () =>
    onSave({
      baseUnit: form.baseUnit,
      maxBet: form.maxBet,
      maxStages: form.maxStages,
      zigzagMinLen: form.zigzagMinLen,
      dragonMinLen: form.dragonMinLen,
      maxRiskPct: form.maxRiskPct / 100,
      playZigzag,
      playDragon,
    });

  return (
    <div className="col">
      <CustomRuleEditor
        rules={config.customRules}
        baseUnit={config.baseUnit}
        onChange={(customRules) => onSave({ customRules })}
      />

      <div className="panel">
        <h2>
          Stratégies intégrées <span className="sub">· zigzag &amp; dragon</span>
        </h2>

        {/* ZIGZAG */}
        <div className={`strat-card ${playZigzag ? 'on' : ''}`}>
          <label className="strat-head">
            <input type="checkbox" checked={playZigzag} onChange={() => setPlayZigzag((v) => !v)} />
            <span className="strat-name">Zigzag / Ping-pong <span className="cn">單跳</span></span>
          </label>
          <div className="strat-body">
            <MiniRoad trigger={zzSeq} bets={zzBet} />
            <div className="strat-info">
              <p className="coach-text">
                Ça alterne sur <strong>{form.zigzagMinLen} coups</strong> → on mise la continuation
                (🎯 opposé du dernier), <strong>progression bornée</strong> ({ladder.map(m).join(' → ')} → STOP).
              </p>
              <div className="field inline">
                <label>Coups alternés requis</label>
                <input type="number" min={2} max={10} value={form.zigzagMinLen} onChange={num('zigzagMinLen')} />
              </div>
            </div>
          </div>
        </div>

        {/* DRAGON */}
        <div className={`strat-card ${playDragon ? 'on' : ''}`}>
          <label className="strat-head">
            <input type="checkbox" checked={playDragon} onChange={() => setPlayDragon((v) => !v)} />
            <span className="strat-name">Dragon <span className="cn">跟龍</span></span>
          </label>
          <div className="strat-body">
            <MiniRoad trigger={dgSeq} bets={dgBet} />
            <div className="strat-info">
              <p className="coach-text">
                Série de <strong>{form.dragonMinLen}</strong> mêmes → on suit (🎯 même couleur) en{' '}
                <strong>mise à plat</strong>. Si le dragon casse, on arrête (pas de chasse).
              </p>
              <div className="field inline">
                <label>Longueur de série requise</label>
                <input type="number" min={3} max={12} value={form.dragonMinLen} onChange={num('dragonMinLen')} />
              </div>
            </div>
          </div>
        </div>

        {/* MISES */}
        <div className="coach-label" style={{ marginTop: 6 }}>GESTION DES MISES</div>
        <div className="stat-row">
          <div className="field">
            <label>Mise de base</label>
            <input type="number" min={10} step={10} value={form.baseUnit} onChange={num('baseUnit')} />
          </div>
          <div className="field">
            <label>Mise max</label>
            <input type="number" min={10} step={50} value={form.maxBet} onChange={num('maxBet')} />
          </div>
          <div className="field">
            <label>Paliers max (zigzag)</label>
            <input type="number" min={1} max={6} value={form.maxStages} onChange={num('maxStages')} />
          </div>
          <div className="field">
            <label>Risque max / mise (%)</label>
            <input type="number" min={1} max={100} value={form.maxRiskPct} onChange={num('maxRiskPct')} />
          </div>
        </div>
        <div className="muted">
          Échelle zigzag : <strong style={{ color: 'var(--gold)' }}>{ladder.map(m).join(' → ')}</strong>
          {' '}→ STOP · plafond/mise {m(effectiveCap(preview))}
        </div>

        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn gold" onClick={save}>Enregistrer la stratégie</button>
        </div>
      </div>
    </div>
  );
}
