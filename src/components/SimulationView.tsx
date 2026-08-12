import { useState } from 'react';
import {
  simulateHichamMany,
  simulateHichamStrat,
  type HichamOpts,
  type HichamReport,
} from '../engine/hichamStrat';
import { useMoney } from '../state/currency';
import type { CoachConfig } from '../engine/types';

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export function SimulationView({ config }: { config: CoachConfig }) {
  const fmt = useMoney();
  const [unit, setUnit] = useState(config.baseUnit);
  const [hands, setHands] = useState(1000);
  const [bankroll, setBankroll] = useState(config.stack);
  const [shoeLimited, setShoeLimited] = useState(true);
  const [shoeHands, setShoeHands] = useState(55);
  const [runs, setRuns] = useState(1);

  const [single, setSingle] = useState<HichamReport | null>(null);
  const [multi, setMulti] = useState<HichamReport[] | null>(null);

  const opts: HichamOpts = {
    unit: Math.max(1, unit),
    hands: Math.max(1, hands),
    bankroll: Math.max(1, bankroll),
    shoeHands: shoeLimited ? Math.max(10, shoeHands) : 0,
  };

  const run = () => {
    if (runs <= 1) {
      setMulti(null);
      setSingle(simulateHichamStrat(opts));
    } else {
      setSingle(null);
      setMulti(simulateHichamMany(opts, Math.min(runs, 500)));
    }
  };

  return (
    <div className="col">
      <div className="panel">
        <h2>
          Simulation <span className="sub">· stratégie « hichamostratforbanker »</span>
        </h2>
        <p className="coach-text" style={{ marginTop: 0 }}>
          Simule TA stratégie (signal = nouvelle répétition, Banquier en 1‑2‑4‑8 avec pause après
          l'étape 2). Choisis l'unité, le nombre de coups et la bankroll, puis regarde le bilan en{' '}
          {fmt(0).replace(/[\d\s.,]/g, '').trim() || 'devise'}.
        </p>

        <div className="stat-row">
          <div className="field">
            <label>Unité de mise (1 unité)</label>
            <input type="number" min={10} step={10} value={unit} onChange={(e) => setUnit(Number(e.target.value))} />
            <div className="hint">
              Échelle : {fmt(unit)} → {fmt(unit * 2)} → {fmt(unit * 4)} → {fmt(unit * 8)}
            </div>
          </div>
          <div className="field">
            <label>Bankroll de départ</label>
            <input type="number" min={100} step={100} value={bankroll} onChange={(e) => setBankroll(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Nombre de coups</label>
            <input type="number" min={10} step={100} value={hands} onChange={(e) => setHands(Number(e.target.value))} />
            <div className="btn-row" style={{ marginTop: 6 }}>
              {[500, 1000, 2000, 5000].map((n) => (
                <button key={n} className="chip-btn" onClick={() => setHands(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Nombre de simulations</label>
            <input type="number" min={1} max={500} value={runs} onChange={(e) => setRuns(Number(e.target.value))} />
            <div className="hint">{runs > 1 ? 'Bilan agrégé (moyennes).' : 'Bilan détaillé d\'une session.'}</div>
          </div>
          <div className="field">
            <label className="toggle" style={{ color: 'var(--text)' }}>
              <input type="checkbox" checked={shoeLimited} onChange={() => setShoeLimited((v) => !v)} />
              Sabot limité
            </label>
            <input
              type="number"
              min={20}
              max={120}
              value={shoeHands}
              disabled={!shoeLimited}
              onChange={(e) => setShoeHands(Number(e.target.value))}
            />
            <div className="hint">{shoeLimited ? `Nouveau sabot tous les ${shoeHands} coups.` : 'Sabot infini.'}</div>
          </div>
        </div>

        <div className="btn-row" style={{ marginTop: 8 }}>
          <button className="btn gold big" onClick={run} style={{ maxWidth: 280 }}>
            ▶ Lancer la simulation
          </button>
        </div>

        {single && <SingleReport r={single} fmt={fmt} unit={opts.unit} />}
        {multi && <MultiReport reports={multi} fmt={fmt} />}
        {!single && !multi && (
          <div className="empty-note">Règle les paramètres et lance la simulation.</div>
        )}
      </div>
    </div>
  );
}

function SingleReport({ r, fmt, unit }: { r: HichamReport; fmt: (n: number) => string; unit: number }) {
  const netCls = r.net > 0 ? 'pos' : r.net < 0 ? 'neg' : '';
  const winRate = r.wins + r.losses ? r.wins / (r.wins + r.losses) : 0;
  return (
    <div style={{ marginTop: 14 }}>
      <div className="bt-grid">
        <Metric k="Bilan" v={`${r.net >= 0 ? '+' : ''}${fmt(r.net)}`} cls={netCls} accent />
        <Metric k="En unités" v={`${r.net >= 0 ? '+' : ''}${(r.net / unit).toFixed(1)} u`} cls={netCls} />
        <Metric k="ROI" v={pct(r.roi)} cls={r.roi >= 0 ? 'pos' : 'neg'} />
        <Metric k="Bankroll finale" v={fmt(r.endStack)} gold />
        <Metric k="Coups joués" v={`${r.hands}`} />
        <Metric k="Mises placées" v={`${r.bets}`} />
        <Metric k="Paris gagnés" v={`${r.wins}/${r.wins + r.losses} (${pct(winRate)})`} />
        <Metric k="Plus bas / drawdown" v={`${fmt(r.minStack)} / -${fmt(r.maxDrawdown)}`} />
      </div>

      <div className="coach-label" style={{ marginTop: 14 }}>DÉTAIL PAR ÉTAPE</div>
      <div className="bt-grid">
        <Metric k="🟢 Victoires étape 1" v={`${r.winsByStage[0]}`} />
        <Metric k="🟢 Victoires étape 2" v={`${r.winsByStage[1]}`} />
        <Metric k="🟢 Victoires étape 3" v={`${r.winsByStage[2]}`} />
        <Metric k="🟢 Victoires étape 4" v={`${r.winsByStage[3]}`} />
        <Metric k="🩸 Pertes étape 4" v={`${r.busts}`} cls={r.busts ? 'neg' : ''} accent />
        <Metric k="Égalités (push)" v={`${r.pushes}`} />
      </div>

      {r.busted && (
        <div className="risk" style={{ marginTop: 10 }}>
          💀 Bankroll épuisée au coup #{r.bustedAtHand}.
        </div>
      )}

      <Equity equity={r.equity} start={r.startStack} />
    </div>
  );
}

function MultiReport({ reports, fmt }: { reports: HichamReport[]; fmt: (n: number) => string }) {
  const n = reports.length;
  const avg = (sel: (r: HichamReport) => number) => reports.reduce((s, r) => s + sel(r), 0) / n;
  const avgNet = avg((r) => r.net);
  const pos = reports.filter((r) => r.net > 0).length;
  const busts = reports.filter((r) => r.busted).length;
  const best = Math.max(...reports.map((r) => r.net));
  const worst = Math.min(...reports.map((r) => r.net));
  return (
    <div style={{ marginTop: 14 }}>
      <div className="muted" style={{ marginBottom: 10 }}>
        Agrégé sur <strong>{n} simulations</strong>.
      </div>
      <div className="bt-grid">
        <Metric k="Bilan moyen" v={`${avgNet >= 0 ? '+' : ''}${fmt(avgNet)}`} cls={avgNet >= 0 ? 'pos' : 'neg'} accent />
        <Metric k="Sessions gagnantes" v={`${pos}/${n} (${pct(pos / n)})`} />
        <Metric k="Sessions ruinées" v={`${busts}/${n} (${pct(busts / n)})`} cls={busts ? 'neg' : ''} />
        <Metric k="Meilleure" v={`+${fmt(best)}`} cls="pos" />
        <Metric k="Pire" v={fmt(worst)} cls="neg" />
      </div>
      <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
        ⚠️ Sur le long terme, le bilan moyen tend vers le négatif (avantage maison). La stratégie
        change surtout la <strong>variance</strong> et le risque de ruine, pas l'espérance.
      </div>
    </div>
  );
}

function Metric({ k, v, cls, gold, accent }: { k: string; v: string; cls?: string; gold?: boolean; accent?: boolean }) {
  return (
    <div className={`stat ${accent ? 'accent' : ''}`}>
      <div className="k">{k}</div>
      <div className={`v ${cls ?? ''} ${gold ? 'gold' : ''}`}>{v}</div>
    </div>
  );
}

function Equity({ equity, start }: { equity: number[]; start: number }) {
  if (equity.length < 2) return null;
  const W = 600;
  const H = 90;
  // échantillonne si trop de points
  const step = Math.max(1, Math.floor(equity.length / 600));
  const pts0 = equity.filter((_, i) => i % step === 0);
  const min = Math.min(start, ...pts0);
  const max = Math.max(start, ...pts0);
  const range = max - min || 1;
  const x = (i: number) => (i / (pts0.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / range) * H;
  const pts = pts0.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const up = equity[equity.length - 1] >= start;
  return (
    <div className="equity">
      <div className="road-label" style={{ marginTop: 12 }}>ÉVOLUTION DE LA BANKROLL</div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="equity-svg">
        <line x1="0" y1={y(start)} x2={W} y2={y(start)} stroke="rgba(255,255,255,0.18)" strokeDasharray="4 4" />
        <polyline points={pts} fill="none" stroke={up ? 'var(--tie)' : 'var(--banker)'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
