import { useState } from 'react';
import { simulateMany, simulateShoe, type BacktestReport } from '../engine/backtest';
import { useMoney } from '../state/currency';
import type { CoachConfig } from '../engine/types';

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function BacktestView({ config }: { config: CoachConfig }) {
  const fmt = useMoney();
  const [single, setSingle] = useState<BacktestReport | null>(null);
  const [multi, setMulti] = useState<BacktestReport[] | null>(null);

  const runSingle = () => {
    setMulti(null);
    setSingle(simulateShoe(config));
  };
  const runMulti = (n: number) => {
    setSingle(null);
    setMulti(simulateMany(config, n));
  };

  return (
    <div className="panel">
      <h2>
        Backtest <span className="sub">· le coach joue le sabot à ta place</span>
      </h2>

      <p className="muted" style={{ marginTop: 0 }}>
        Le coach applique <strong>à la lettre</strong> ta stratégie (zigzag{config.playDragon ? ' + dragon' : ''})
        sur un sabot entier, puis te donne le bilan. Idéal pour tester une stratégie avant de jouer.
      </p>

      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button className="btn gold" onClick={runSingle}>
          ▶ Jouer 1 sabot
        </button>
        <button className="btn" onClick={() => runMulti(20)}>
          ▶▶ Jouer 20 sabots
        </button>
        <button className="btn" onClick={() => runMulti(100)}>
          ▶▶▶ Jouer 100 sabots
        </button>
      </div>

      {single && <SingleReport r={single} fmt={fmt} />}
      {multi && <MultiReport reports={multi} fmt={fmt} startStack={config.stack} />}
      {!single && !multi && (
        <div className="empty-note">Lance un backtest pour voir le bilan du coach.</div>
      )}
    </div>
  );
}

function SingleReport({ r, fmt }: { r: BacktestReport; fmt: (n: number) => string }) {
  const netClass = r.net > 0 ? 'pos' : r.net < 0 ? 'neg' : '';
  return (
    <div>
      <div className="bt-grid">
        <Metric k="Coups dans le sabot" v={`${r.hands}`} />
        <Metric k="Mises placées" v={`${r.betsPlaced} (${pct(r.hitRate)})`} />
        <Metric k="Prévisions justes" v={`${r.wins}/${r.wins + r.losses} (${pct(r.winRate)})`} accent />
        <Metric k="Bilan" v={`${r.net >= 0 ? '+' : ''}${fmt(r.net)}`} cls={netClass} />
        <Metric k="Stack final" v={fmt(r.endStack)} gold />
        <Metric k="ROI" v={pct(r.roi)} cls={r.roi >= 0 ? 'pos' : 'neg'} />
        <Metric k="Plus bas / drawdown" v={`${fmt(r.minStack)} / -${fmt(r.maxDrawdown)}`} />
        <Metric k="Total misé" v={fmt(r.staked)} />
      </div>

      {r.busted && (
        <div className="risk" style={{ marginTop: 10 }}>
          💀 Ruine au coup #{r.bustedAtHand}. La stratégie a vidé la bankroll sur ce sabot.
        </div>
      )}

      <Equity equity={r.equity} start={r.startStack} />

      <div className="coach-label" style={{ marginTop: 14 }}>PAR STRATÉGIE</div>
      <div className="bt-grid">
        <Metric
          k="Zigzag 單跳"
          v={`${r.byStrategy.zigzag.wins}/${r.byStrategy.zigzag.bets} · ${r.byStrategy.zigzag.net >= 0 ? '+' : ''}${fmt(r.byStrategy.zigzag.net)}`}
        />
        <Metric
          k="Dragon 跟龍"
          v={`${r.byStrategy.dragon.wins}/${r.byStrategy.dragon.bets} · ${r.byStrategy.dragon.net >= 0 ? '+' : ''}${fmt(r.byStrategy.dragon.net)}`}
        />
        <Metric k="Résultats P / B / T" v={`${r.outcomes.P} / ${r.outcomes.B} / ${r.outcomes.T}`} />
      </div>
    </div>
  );
}

function MultiReport({
  reports,
  fmt,
  startStack,
}: {
  reports: BacktestReport[];
  fmt: (n: number) => string;
  startStack: number;
}) {
  const n = reports.length;
  const avg = (sel: (r: BacktestReport) => number) => reports.reduce((s, r) => s + sel(r), 0) / n;
  const avgNet = avg((r) => r.net);
  const busts = reports.filter((r) => r.busted).length;
  const winning = reports.filter((r) => r.net > 0).length;
  const avgWinRate = avg((r) => r.winRate);
  const best = Math.max(...reports.map((r) => r.net));
  const worst = Math.min(...reports.map((r) => r.net));

  return (
    <div>
      <div className="muted" style={{ marginBottom: 10 }}>
        Agrégé sur <strong>{n} sabots</strong> (bankroll de départ {fmt(startStack)}).
      </div>
      <div className="bt-grid">
        <Metric k="Bilan moyen / sabot" v={`${avgNet >= 0 ? '+' : ''}${fmt(avgNet)}`} cls={avgNet >= 0 ? 'pos' : 'neg'} accent />
        <Metric k="Sabots gagnants" v={`${winning}/${n} (${pct(winning / n)})`} />
        <Metric k="Sabots ruinés" v={`${busts}/${n} (${pct(busts / n)})`} cls={busts ? 'neg' : ''} />
        <Metric k="Prévisions justes (moy.)" v={pct(avgWinRate)} />
        <Metric k="Meilleur sabot" v={`+${fmt(best)}`} cls="pos" />
        <Metric k="Pire sabot" v={fmt(worst)} cls="neg" />
      </div>
      <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
        ⚠️ Rappel : sur le long terme, aucune stratégie ne bat l'avantage de la maison. Le bilan
        moyen tend vers le négatif — l'app sert à jouer avec discipline, pas à gagner sûrement.
      </div>
    </div>
  );
}

function Metric({
  k,
  v,
  cls,
  gold,
  accent,
}: {
  k: string;
  v: string;
  cls?: string;
  gold?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`stat ${accent ? 'accent' : ''}`}>
      <div className="k">{k}</div>
      <div className={`v ${cls ?? ''} ${gold ? 'gold' : ''}`}>{v}</div>
    </div>
  );
}

/** Mini-courbe d'évolution du stack. */
function Equity({ equity, start }: { equity: number[]; start: number }) {
  if (equity.length < 2) return null;
  const W = 600;
  const H = 90;
  const min = Math.min(start, ...equity);
  const max = Math.max(start, ...equity);
  const range = max - min || 1;
  const x = (i: number) => (i / (equity.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / range) * H;
  const pts = equity.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const zeroY = y(start);
  const up = equity[equity.length - 1] >= start;

  return (
    <div className="equity">
      <div className="road-label" style={{ marginTop: 12 }}>ÉVOLUTION DU STACK</div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="equity-svg">
        <line x1="0" y1={zeroY} x2={W} y2={zeroY} stroke="rgba(255,255,255,0.18)" strokeDasharray="4 4" />
        <polyline
          points={pts}
          fill="none"
          stroke={up ? 'var(--tie)' : 'var(--banker)'}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
