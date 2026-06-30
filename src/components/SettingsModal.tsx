import { useState } from 'react';
import { effectiveCap, stakeForStage } from '../engine/coach';
import type { CoachConfig } from '../engine/types';

export function SettingsModal({
  config,
  onSave,
  onClose,
}: {
  config: CoachConfig;
  onSave: (patch: Partial<CoachConfig>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    baseUnit: config.baseUnit,
    stack: config.stack,
    maxBet: config.maxBet,
    maxStages: config.maxStages,
    zigzagMinLen: config.zigzagMinLen,
    maxRiskPct: Math.round(config.maxRiskPct * 100),
    dragonMinLen: config.dragonMinLen,
  });
  const [playZigzag, setPlayZigzag] = useState(config.playZigzag);
  const [playDragon, setPlayDragon] = useState(config.playDragon);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: Number(e.target.value) }));

  const preview: CoachConfig = {
    ...config,
    baseUnit: form.baseUnit,
    stack: form.stack,
    maxBet: form.maxBet,
    maxStages: form.maxStages,
    zigzagMinLen: form.zigzagMinLen,
    maxRiskPct: form.maxRiskPct / 100,
    dragonMinLen: form.dragonMinLen,
    playZigzag,
    playDragon,
  };
  const ladder = Array.from({ length: form.maxStages }, (_, i) => stakeForStage(i, preview));

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ color: 'var(--gold-soft)', marginTop: 0, letterSpacing: 2 }}>
          PARAMÈTRES DE SESSION
        </h2>

        <div className="stat-row">
          <div className="field">
            <label>Mise de base (DH)</label>
            <input type="number" value={form.baseUnit} min={10} step={10} onChange={set('baseUnit')} />
          </div>
          <div className="field">
            <label>Stack de départ (DH)</label>
            <input type="number" value={form.stack} min={100} step={100} onChange={set('stack')} />
          </div>
          <div className="field">
            <label>Mise max (DH)</label>
            <input type="number" value={form.maxBet} min={10} step={50} onChange={set('maxBet')} />
          </div>
          <div className="field">
            <label>Paliers max (avant STOP)</label>
            <input type="number" value={form.maxStages} min={1} max={6} onChange={set('maxStages')} />
          </div>
          <div className="field">
            <label>Zigzag : coups alternés requis</label>
            <input type="number" value={form.zigzagMinLen} min={2} max={10} onChange={set('zigzagMinLen')} />
            <div className="hint">4 = "2 tours" de zigzag</div>
          </div>
          <div className="field">
            <label>Risque max / mise (% du stack)</label>
            <input type="number" value={form.maxRiskPct} min={1} max={100} onChange={set('maxRiskPct')} />
          </div>
        </div>

        <div className="coach-label" style={{ marginBottom: 8 }}>STRATÉGIES JOUÉES</div>
        <div className="stat-row" style={{ marginBottom: 8 }}>
          <label className="toggle" style={{ color: 'var(--text)' }}>
            <input type="checkbox" checked={playZigzag} onChange={() => setPlayZigzag((v) => !v)} />
            Zigzag / ping-pong (單跳)
          </label>
          <label className="toggle" style={{ color: 'var(--text)' }}>
            <input type="checkbox" checked={playDragon} onChange={() => setPlayDragon((v) => !v)} />
            Dragon — suivre la série (跟龍)
          </label>
          <div className="field">
            <label>Dragon : longueur de série requise</label>
            <input type="number" value={form.dragonMinLen} min={3} max={12} onChange={set('dragonMinLen')} />
            <div className="hint">Mise à plat ; si le dragon casse, on arrête (pas de chasse).</div>
          </div>
        </div>

        <div className="muted" style={{ marginBottom: 14 }}>
          Progression bornée prévue :{' '}
          <strong style={{ color: 'var(--gold)' }}>
            {ladder.map((a) => a.toLocaleString('fr-FR')).join(' → ')} DH
          </strong>
          <br />
          Plafond effectif par mise : {effectiveCap(preview).toLocaleString('fr-FR')} DH
        </div>

        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn gold"
            onClick={() => {
              onSave({
                baseUnit: form.baseUnit,
                stack: form.stack,
                maxBet: form.maxBet,
                maxStages: form.maxStages,
                zigzagMinLen: form.zigzagMinLen,
                maxRiskPct: form.maxRiskPct / 100,
                dragonMinLen: form.dragonMinLen,
                playZigzag,
                playDragon,
              });
              onClose();
            }}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
