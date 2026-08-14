import { useState } from 'react';
import {
  simulateHichamMany,
  simulateHichamStrat,
  type HichamOpts,
  type HichamReport,
} from '../engine/hichamStrat';
import { simulateStratTendance, simulateTendanceMany, type TendanceOpts } from '../engine/stratTendance';
import { useMoney } from '../state/currency';
import type { CoachConfig } from '../engine/types';

type StratType = 'banker' | 'tendance';

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export function SimulationView({ config }: { config: CoachConfig }) {
  const fmt = useMoney();
  const b = config.baseUnit;
  const [stratType, setStratType] = useState<StratType>('banker');
  const [stakes, setStakes] = useState<number[]>([b, b * 2, b * 4, b * 8]);
  // stratTendance
  const [zigzag, setZigzag] = useState(true);
  const [zigStakes, setZigStakes] = useState<number[]>([b, b * 2, b * 4, b * 8]);
  const [dragon, setDragon] = useState(true);
  const [dragStakes, setDragStakes] = useState<number[]>([b, b * 2, b * 4, b * 8]);
  const setZig = (i: number, v: number) => setZigStakes((s) => s.map((x, j) => (j === i ? Math.max(0, v) : x)));
  const setDrag = (i: number, v: number) => setDragStakes((s) => s.map((x, j) => (j === i ? Math.max(0, v) : x)));
  const [hands, setHands] = useState(1000);
  const [bankroll, setBankroll] = useState(config.stack);
  const [shoeLimited, setShoeLimited] = useState(true);
  const [shoeHands, setShoeHands] = useState(55);
  const [runs, setRuns] = useState(1);

  // Vengeance
  const [vengeance, setVengeance] = useState(false);
  const [venStakes, setVenStakes] = useState<number[]>([b * 5, b * 10, b * 20, b * 40]);
  const [venTimes, setVenTimes] = useState(3);

  const [single, setSingle] = useState<HichamReport | null>(null);
  const [multi, setMulti] = useState<HichamReport[] | null>(null);

  const setStake = (i: number, v: number) =>
    setStakes((s) => s.map((x, j) => (j === i ? Math.max(0, v) : x)));
  const setVenStake = (i: number, v: number) =>
    setVenStakes((s) => s.map((x, j) => (j === i ? Math.max(0, v) : x)));

  const common = {
    hands: Math.max(1, hands),
    bankroll: Math.max(1, bankroll),
    shoeHands: shoeLimited ? Math.max(10, shoeHands) : 0,
  };
  const opts: HichamOpts = {
    ...common,
    stakes: stakes.map((s) => Math.max(0, s)),
    vengeance,
    vengeanceStakes: venStakes.map((s) => Math.max(0, s)),
    vengeanceTimes: Math.max(1, venTimes),
  };
  const tendanceOpts: TendanceOpts = {
    ...common,
    zigzag,
    zigzagStakes: zigStakes.map((s) => Math.max(0, s)),
    dragon,
    dragonStakes: dragStakes.map((s) => Math.max(0, s)),
  };

  const run = () => {
    const one = stratType === 'banker' ? simulateHichamStrat(opts) : simulateStratTendance(tendanceOpts);
    const many = () =>
      stratType === 'banker'
        ? simulateHichamMany(opts, Math.min(runs, 500))
        : simulateTendanceMany(tendanceOpts, Math.min(runs, 500));
    if (runs <= 1) {
      setMulti(null);
      setSingle(one);
    } else {
      setSingle(null);
      setMulti(many());
    }
  };

  const baseUnit = stratType === 'banker' ? opts.stakes[0] || 1 : zigStakes[0] || 1;

  return (
    <div className="col">
      <div className="panel">
        <h2>
          Simulation <span className="sub">· teste une stratégie sur N coups</span>
        </h2>

        <div className="seg-toggle" style={{ marginBottom: 12 }}>
          <button className={stratType === 'banker' ? 'active' : ''} onClick={() => { setStratType('banker'); setSingle(null); setMulti(null); }}>
            hichamostratforbanker
          </button>
          <button className={stratType === 'tendance' ? 'active' : ''} onClick={() => { setStratType('tendance'); setSingle(null); setMulti(null); }}>
            stratTendance
          </button>
        </div>

        <p className="coach-text" style={{ marginTop: 0 }}>
          {stratType === 'banker'
            ? 'Signal = nouvelle répétition, Banquier en 4 étapes avec pause après l’étape 2. Choisis la mise de chaque étape.'
            : 'Suit la tendance : Zigzag (dès un changement -> on parie l’alternance) et/ou Dragon (dès un doublement -> on parie la série). Chaque style a ses 4 mises.'}
        </p>

        {stratType === 'banker' && (
          <>
        <div className="coach-label" style={{ marginBottom: 8 }}>MISE PAR ÉTAPE (Banquier)</div>
        <div className="stakes-row">
          {stakes.map((s, i) => (
            <div key={i} className="stake-field">
              <span className={`stake-idx st${i + 1}`}>Étape {i + 1}</span>
              <input type="number" min={0} step={10} value={s} onChange={(e) => setStake(i, Number(e.target.value))} />
            </div>
          ))}
          <div className="stake-total-note">Total si les 4 perdent : <strong>{fmt(stakes.reduce((a, x) => a + x, 0))}</strong></div>
        </div>

        {/* Vengeance */}
        <div className={`venge-box ${vengeance ? 'on' : ''}`}>
          <div className="venge-head">
            <label className="toggle" style={{ color: 'var(--text)' }}>
              <input type="checkbox" checked={vengeance} onChange={() => setVengeance((v) => !v)} />
              🔥 <strong>Vengeance</strong> — après une perte étape 4
            </label>
            <div className="field inline" style={{ marginLeft: 'auto' }}>
              <label>Active pendant (cycles)</label>
              <input type="number" min={1} max={20} value={venTimes} disabled={!vengeance} onChange={(e) => setVenTimes(Number(e.target.value))} />
            </div>
          </div>
          <div className="stakes-row" style={{ opacity: vengeance ? 1 : 0.45 }}>
            {venStakes.map((s, i) => (
              <div key={i} className="stake-field">
                <span className={`stake-idx venge st${i + 1}`}>Vengeance {i + 1}</span>
                <input type="number" min={0} step={10} value={s} disabled={!vengeance} onChange={(e) => setVenStake(i, Number(e.target.value))} />
              </div>
            ))}
            <div className="stake-total-note">
              Après une perte étape 4, on mise ces montants pendant <strong>{venTimes}</strong> cycle
              {venTimes > 1 ? 's' : ''}, puis retour à la normale.
            </div>
          </div>
        </div>
          </>
        )}

        {stratType === 'tendance' && (
          <>
            <div className={`venge-box ${zigzag ? 'on-zig' : ''}`}>
              <div className="venge-head">
                <label className="toggle" style={{ color: 'var(--text)' }}>
                  <input type="checkbox" checked={zigzag} onChange={() => setZigzag((v) => !v)} />
                  🏓 <strong>Tendance Zigzag</strong> — dès un changement, on parie l'alternance
                </label>
              </div>
              <div className="stakes-row" style={{ opacity: zigzag ? 1 : 0.45 }}>
                {zigStakes.map((s, i) => (
                  <div key={i} className="stake-field">
                    <span className={`stake-idx st${i + 1}`}>Zig {i + 1}</span>
                    <input type="number" min={0} step={10} value={s} disabled={!zigzag} onChange={(e) => setZig(i, Number(e.target.value))} />
                  </div>
                ))}
              </div>
            </div>

            <div className={`venge-box ${dragon ? 'on-drag' : ''}`} style={{ marginTop: 12 }}>
              <div className="venge-head">
                <label className="toggle" style={{ color: 'var(--text)' }}>
                  <input type="checkbox" checked={dragon} onChange={() => setDragon((v) => !v)} />
                  🐉 <strong>Tendance Dragon</strong> — dès un doublement, on parie la série
                </label>
              </div>
              <div className="stakes-row" style={{ opacity: dragon ? 1 : 0.45 }}>
                {dragStakes.map((s, i) => (
                  <div key={i} className="stake-field">
                    <span className={`stake-idx drag st${i + 1}`}>Drag {i + 1}</span>
                    <input type="number" min={0} step={10} value={s} disabled={!dragon} onChange={(e) => setDrag(i, Number(e.target.value))} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="stat-row" style={{ marginTop: 12 }}>
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

        {single && <SingleReport r={single} fmt={fmt} unit={baseUnit} />}
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
        {r.vengeanceCycles > 0 && <Metric k="🔥 Cycles vengeance" v={`${r.vengeanceCycles}`} />}
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
