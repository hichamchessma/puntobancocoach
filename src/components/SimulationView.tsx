import { useEffect, useRef, useState } from 'react';
import {
  simulateHichamMany,
  simulateHichamStrat,
  type HichamOpts,
  type HichamReport,
} from '../engine/hichamStrat';
import { simulateStratTendance, simulateTendanceMany, type TendanceOpts } from '../engine/stratTendance';
import {
  defaultAntiCfg,
  simulateAntiMany,
  simulateAntiStrat,
  type AntiCfg,
  type AntiSimOpts,
} from '../engine/antiStrat';
import { AntiConfigEditor } from './AntiConfig';
import {
  defaultFourmiCfg,
  simulateFourmi,
  simulateFourmiMany,
  type FourmiCfg,
  type FourmiEntry,
  type FourmiSimOpts,
} from '../engine/laFourmi';
import {
  defaultThreeStepCfg,
  simulateThreeStep,
  simulateThreeStepMany,
  type ThreeStepCfg,
  type ThreeStepSimOpts,
} from '../engine/threeStep';
import { useMoney } from '../state/currency';
import type { CoachConfig } from '../engine/types';

type StratType = 'banker' | 'tendance' | 'anti' | 'fourmi' | 'threestep';

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export function SimulationView({ config }: { config: CoachConfig }) {
  const fmt = useMoney();
  const b = config.baseUnit;
  const [stratType, setStratType] = useState<StratType>('banker');
  const [bankerSide, setBankerSide] = useState<'P' | 'B'>('P');
  const [stakes, setStakes] = useState<number[]>([b, b * 2, b * 4, b * 8]);
  // stratTendance (mise à plat : un seul montant par tendance)
  const [zigzag, setZigzag] = useState(true);
  const [zigBet, setZigBet] = useState(b);
  const [dragon, setDragon] = useState(true);
  const [dragBet, setDragBet] = useState(b);
  // strat anti (contre la tendance)
  const [antiCfg, setAntiCfg] = useState<AntiCfg>(defaultAntiCfg(b));
  // La Fourmi
  const [fourmiCfg, setFourmiCfg] = useState<FourmiCfg>(defaultFourmiCfg(b));
  // 3 Steps
  const [threeCfg, setThreeCfg] = useState<ThreeStepCfg>(defaultThreeStepCfg(b));
  const [hands, setHands] = useState(1000);
  const [bankroll, setBankroll] = useState(config.stack);
  const [shoeLimited, setShoeLimited] = useState(true);
  const [shoeHands, setShoeHands] = useState(55);
  const [runs, setRuns] = useState(1);
  // stop-loss / take-profit (comme au trading : coupe la session dès l'objectif)
  const [tpOn, setTpOn] = useState(false);
  const [takeProfit, setTakeProfit] = useState(Math.max(500, Math.round(config.stack * 0.5)));
  const [slOn, setSlOn] = useState(false);
  const [stopLoss, setStopLoss] = useState(Math.max(500, Math.round(config.stack * 0.5)));

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
    stopLoss: slOn ? Math.max(1, stopLoss) : 0,
    takeProfit: tpOn ? Math.max(1, takeProfit) : 0,
  };
  const opts: HichamOpts = {
    ...common,
    side: bankerSide,
    stakes: stakes.map((s) => Math.max(0, s)),
    vengeance,
    vengeanceStakes: venStakes.map((s) => Math.max(0, s)),
    vengeanceTimes: Math.max(1, venTimes),
  };
  const tendanceOpts: TendanceOpts = {
    ...common,
    zigzag,
    zigzagBet: Math.max(0, zigBet),
    dragon,
    dragonBet: Math.max(0, dragBet),
  };
  const antiOpts: AntiSimOpts = { ...common, ...antiCfg };
  const fourmiOpts: FourmiSimOpts = { ...common, ...fourmiCfg };
  const threeOpts: ThreeStepSimOpts = { ...common, ...threeCfg };

  const runOne = () =>
    stratType === 'banker'
      ? simulateHichamStrat(opts)
      : stratType === 'tendance'
        ? simulateStratTendance(tendanceOpts)
        : stratType === 'anti'
          ? simulateAntiStrat(antiOpts)
          : stratType === 'fourmi'
            ? simulateFourmi(fourmiOpts)
            : simulateThreeStep(threeOpts);
  const runMany = (n: number) =>
    stratType === 'banker'
      ? simulateHichamMany(opts, n)
      : stratType === 'tendance'
        ? simulateTendanceMany(tendanceOpts, n)
        : stratType === 'anti'
          ? simulateAntiMany(antiOpts, n)
          : stratType === 'fourmi'
            ? simulateFourmiMany(fourmiOpts, n)
            : simulateThreeStepMany(threeOpts, n);

  const run = () => {
    if (runs <= 1) {
      setMulti(null);
      setSingle(runOne());
    } else {
      setSingle(null);
      setMulti(runMany(Math.min(runs, 500)));
    }
  };

  const antiUnit = antiCfg.antiZig.levelsN1[0] || antiCfg.antiZig.levelsN2[0] || b;
  const baseUnit =
    stratType === 'banker'
      ? opts.stakes[0] || 1
      : stratType === 'tendance'
        ? zigBet || dragBet || 1
        : stratType === 'anti'
          ? antiUnit || 1
          : stratType === 'fourmi'
            ? fourmiCfg.unit || 1
            : threeCfg.base[0] || 1;

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
          <button className={stratType === 'anti' ? 'active' : ''} onClick={() => { setStratType('anti'); setSingle(null); setMulti(null); }}>
            stratAnti
          </button>
          <button className={stratType === 'fourmi' ? 'active' : ''} onClick={() => { setStratType('fourmi'); setSingle(null); setMulti(null); }}>
            🐜 La Fourmi
          </button>
          <button className={stratType === 'threestep' ? 'active' : ''} onClick={() => { setStratType('threestep'); setSingle(null); setMulti(null); }}>
            🎯 3 Steps
          </button>
        </div>

        <p className="coach-text" style={{ marginTop: 0 }}>
          {stratType === 'banker'
            ? 'Signal = nouvelle répétition, mise en 4 étapes avec pause après l’étape 2. Choisis le côté (Joueur/Banquier) et la mise de chaque étape.'
            : stratType === 'tendance'
              ? 'Suit la tendance en MISE À PLAT (aucune progression) : Zigzag (dès un changement -> on parie l’alternance) et/ou Dragon (dès un doublement -> on parie la série). Une seule mise par tendance ; on suit tant que ça tient, on s’arrête dès que ça casse.'
              : stratType === 'anti'
                ? 'On parie CONTRE la tendance : anti-zigzag (le zigzag va s’arrêter -> même couleur) et/ou anti-dragon (la série casse -> couleur opposée), en paliers. Niveau 2 (doux) et/ou niveau 1 (agressif) ; les 2 = vengeance. Tous paliers perdus -> on suit la tendance à plat.'
                : stratType === 'fourmi'
                  ? 'La Fourmi : perdre le minimum, gagner le plus souvent. MISE À PLAT sur le côté à plus faible avantage maison (Joueur ~1,27 % sous la règle 6-moitié), volume réduit par un filtre d’entrée. À combiner avec un Stop-loss / Take-profit serré.'
                  : '3 Steps : martingale sur 3 paliers (1-2-4), à chaque coup, côté Joueur par défaut. Victoire -> reset ; les 3 perdus -> vengeance niveau 1 (optionnelle) ; vengeance 1 perdue 2 fois -> vengeance niveau 2 (optionnelle).'}
        </p>

        {stratType === 'banker' && (
          <>
        <div className="coach-label" style={{ marginBottom: 8 }}>CÔTÉ MISÉ</div>
        <div className="seg-toggle" style={{ marginBottom: 12 }}>
          <button className={bankerSide === 'P' ? 'active' : ''} onClick={() => setBankerSide('P')}>
            🔵 Joueur · payé plein
          </button>
          <button className={bankerSide === 'B' ? 'active' : ''} onClick={() => setBankerSide('B')}>
            🔴 Banquier · 6 = moitié
          </button>
        </div>
        <div className="coach-label" style={{ marginBottom: 8 }}>MISE PAR ÉTAPE ({bankerSide === 'P' ? 'Joueur' : 'Banquier'})</div>
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
          <div className="tend-row">
            <div className={`venge-box ${zigzag ? 'on-zig' : ''}`}>
              <label className="toggle" style={{ color: 'var(--text)' }}>
                <input type="checkbox" checked={zigzag} onChange={() => setZigzag((v) => !v)} />
                🏓 <strong>Zigzag</strong> — dès un changement, on parie l'alternance
              </label>
              <div className="field" style={{ marginTop: 8, opacity: zigzag ? 1 : 0.45 }}>
                <label>Mise à plat (Zigzag)</label>
                <input type="number" min={0} step={10} value={zigBet} disabled={!zigzag} onChange={(e) => setZigBet(Number(e.target.value))} />
              </div>
            </div>

            <div className={`venge-box ${dragon ? 'on-drag' : ''}`}>
              <label className="toggle" style={{ color: 'var(--text)' }}>
                <input type="checkbox" checked={dragon} onChange={() => setDragon((v) => !v)} />
                🐉 <strong>Dragon</strong> — dès un doublement, on parie la série
              </label>
              <div className="field" style={{ marginTop: 8, opacity: dragon ? 1 : 0.45 }}>
                <label>Mise à plat (Dragon)</label>
                <input type="number" min={0} step={10} value={dragBet} disabled={!dragon} onChange={(e) => setDragBet(Number(e.target.value))} />
              </div>
            </div>
          </div>
        )}

        {stratType === 'anti' && <AntiConfigEditor value={antiCfg} onChange={setAntiCfg} />}

        {stratType === 'threestep' && (
          <>
            <div className="coach-label" style={{ marginBottom: 8 }}>CÔTÉ</div>
            <div className="seg-toggle" style={{ marginBottom: 12 }}>
              <button className={threeCfg.side === 'P' ? 'active' : ''} onClick={() => setThreeCfg((c) => ({ ...c, side: 'P' }))}>
                🔵 Joueur
              </button>
              <button className={threeCfg.side === 'B' ? 'active' : ''} onClick={() => setThreeCfg((c) => ({ ...c, side: 'B' }))}>
                🔴 Banquier
              </button>
            </div>
            <div className="coach-label" style={{ marginBottom: 8 }}>MISE DE BASE (3 paliers)</div>
            <div className="stakes-row">
              {threeCfg.base.map((s, i) => (
                <div key={i} className="stake-field">
                  <span className={`stake-idx st${i + 1}`}>Palier {i + 1}</span>
                  <input type="number" min={0} step={10} value={s} onChange={(e) => setThreeCfg((c) => ({ ...c, base: c.base.map((x, j) => (j === i ? Math.max(0, Number(e.target.value)) : x)) }))} />
                </div>
              ))}
            </div>
            <div className={`venge-box ${threeCfg.v1On ? 'on' : ''}`} style={{ marginTop: 12 }}>
              <label className="toggle" style={{ color: 'var(--text)' }}>
                <input type="checkbox" checked={threeCfg.v1On} onChange={() => setThreeCfg((c) => ({ ...c, v1On: !c.v1On }))} />
                🔥 <strong>Vengeance niveau 1</strong>
              </label>
              <div className="stakes-row" style={{ opacity: threeCfg.v1On ? 1 : 0.45, marginTop: 8 }}>
                {threeCfg.v1.map((s, i) => (
                  <div key={i} className="stake-field">
                    <span className={`stake-idx venge st${i + 1}`}>Palier {i + 1}</span>
                    <input type="number" min={0} step={10} value={s} disabled={!threeCfg.v1On} onChange={(e) => setThreeCfg((c) => ({ ...c, v1: c.v1.map((x, j) => (j === i ? Math.max(0, Number(e.target.value)) : x)) }))} />
                  </div>
                ))}
              </div>
            </div>
            <div className={`venge-box ${threeCfg.v2On ? 'on' : ''}`} style={{ marginTop: 10 }}>
              <label className="toggle" style={{ color: 'var(--text)' }}>
                <input type="checkbox" checked={threeCfg.v2On} onChange={() => setThreeCfg((c) => ({ ...c, v2On: !c.v2On }))} />
                🔥🔥 <strong>Vengeance niveau 2</strong> (si veng.1 perd 2 fois)
              </label>
              <div className="stakes-row" style={{ opacity: threeCfg.v2On ? 1 : 0.45, marginTop: 8 }}>
                {threeCfg.v2.map((s, i) => (
                  <div key={i} className="stake-field">
                    <span className={`stake-idx venge st${i + 1}`}>Palier {i + 1}</span>
                    <input type="number" min={0} step={10} value={s} disabled={!threeCfg.v2On} onChange={(e) => setThreeCfg((c) => ({ ...c, v2: c.v2.map((x, j) => (j === i ? Math.max(0, Number(e.target.value)) : x)) }))} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {stratType === 'fourmi' && (
          <>
            <div className="coach-label" style={{ marginBottom: 8 }}>CÔTÉ</div>
            <div className="seg-toggle" style={{ marginBottom: 12 }}>
              <button className={fourmiCfg.side === 'P' ? 'active' : ''} onClick={() => setFourmiCfg((c) => ({ ...c, side: 'P' }))}>
                🔵 Joueur · ~1,27 %
              </button>
              <button className={fourmiCfg.side === 'B' ? 'active' : ''} onClick={() => setFourmiCfg((c) => ({ ...c, side: 'B' }))}>
                🔴 Banquier · ~1,42 %
              </button>
            </div>
            <div className="stat-row">
              <div className="field">
                <label>Mise à plat</label>
                <input type="number" min={0} step={10} value={fourmiCfg.unit} onChange={(e) => setFourmiCfg((c) => ({ ...c, unit: Math.max(0, Number(e.target.value)) }))} />
              </div>
              <div className="field">
                <label>Filtre d’entrée</label>
                <div className="seg-toggle">
                  {(['hache', 'noDragon', 'always'] as FourmiEntry[]).map((e) => (
                    <button key={e} className={fourmiCfg.entry === e ? 'active' : ''} onClick={() => setFourmiCfg((c) => ({ ...c, entry: e }))}>
                      {e === 'hache' ? '✂️ Haché' : e === 'noDragon' ? '🐉 Sauf dragon' : '♾️ Tous'}
                    </button>
                  ))}
                </div>
                <div className="hint">
                  {fourmiCfg.entry === 'hache'
                    ? 'Mise seulement après un changement (~la moitié des coups).'
                    : fourmiCfg.entry === 'noDragon'
                      ? 'Mise partout sauf pendant un run ≥ 3.'
                      : 'Mise à chaque coup.'}
                </div>
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

        <div className="tend-row" style={{ marginTop: 12 }}>
          <div className={`venge-box ${tpOn ? 'on-drag' : ''}`}>
            <label className="toggle" style={{ color: 'var(--text)' }}>
              <input type="checkbox" checked={tpOn} onChange={() => setTpOn((v) => !v)} />
              🎯 <strong>Take-profit</strong> — on arrête si le gain atteint…
            </label>
            <div className="field" style={{ marginTop: 8, opacity: tpOn ? 1 : 0.45 }}>
              <label>Objectif de gain (DH)</label>
              <input type="number" min={0} step={100} value={takeProfit} disabled={!tpOn} onChange={(e) => setTakeProfit(Number(e.target.value))} />
              <div className="hint">Session coupée dès +{fmt(takeProfit)} de bénéfice.</div>
            </div>
          </div>
          <div className={`venge-box ${slOn ? 'on' : ''}`}>
            <label className="toggle" style={{ color: 'var(--text)' }}>
              <input type="checkbox" checked={slOn} onChange={() => setSlOn((v) => !v)} />
              🛑 <strong>Stop-loss</strong> — on arrête si la perte atteint…
            </label>
            <div className="field" style={{ marginTop: 8, opacity: slOn ? 1 : 0.45 }}>
              <label>Perte max (DH)</label>
              <input type="number" min={0} step={100} value={stopLoss} disabled={!slOn} onChange={(e) => setStopLoss(Number(e.target.value))} />
              <div className="hint">Session coupée dès -{fmt(stopLoss)} de perte.</div>
            </div>
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
  const peakProfit = r.maxStack - r.startStack;
  const troughLoss = r.startStack - r.minStack;
  const timeInProfit = r.equity.length ? r.equity.filter((v) => v >= r.startStack).length / r.equity.length : 0;
  const avgPerBet = r.bets ? r.net / r.bets : 0;
  return (
    <div style={{ marginTop: 14 }}>
      {r.stoppedBy && (
        <div className={r.stoppedBy === 'tp' ? 'tp-banner' : 'sl-banner'} style={{ marginBottom: 10 }}>
          {r.stoppedBy === 'tp'
            ? `🎯 Take-profit atteint — session arrêtée au coup #${r.hands} (objectif touché avant la fin).`
            : `🛑 Stop-loss atteint — session arrêtée au coup #${r.hands} (perte max touchée avant la fin).`}
        </div>
      )}
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

      <div className="coach-label" style={{ marginTop: 14 }}>STATS DÉTAILLÉES (pour décider)</div>
      <div className="bt-grid">
        <Metric k="📈 Plus haut atteint" v={fmt(r.maxStack)} cls="pos" accent />
        <Metric k="🚀 Gain max en cours" v={`+${fmt(peakProfit)}`} cls="pos" />
        <Metric k="📉 Perte max en cours" v={`-${fmt(troughLoss)}`} cls={troughLoss > 0 ? 'neg' : ''} />
        <Metric k="🟢 Meilleure mise" v={`+${fmt(r.bestBet)}`} cls="pos" />
        <Metric k="🔴 Pire mise" v={fmt(r.worstBet)} cls={r.worstBet < 0 ? 'neg' : ''} />
        <Metric k="🔥 + longue série gagnante" v={`${r.maxWinStreak}`} />
        <Metric k="🩸 + longue série perdante" v={`${r.maxLoseStreak}`} cls={r.maxLoseStreak >= 5 ? 'neg' : ''} />
        <Metric k="⏱️ Temps en positif" v={pct(timeInProfit)} cls={timeInProfit >= 0.5 ? 'pos' : ''} />
        <Metric k="Gain moyen / mise" v={`${avgPerBet >= 0 ? '+' : ''}${fmt(avgPerBet)}`} cls={avgPerBet >= 0 ? 'pos' : 'neg'} />
      </div>

      {r.byTendance ? (
        <>
          <div className="coach-label" style={{ marginTop: 14 }}>DÉTAIL PAR TENDANCE</div>
          <div className="bt-grid">
            <Metric
              k="🏓 Zigzag (W/L)"
              v={`${r.byTendance.zig.wins}/${r.byTendance.zig.losses}`}
            />
            <Metric
              k="🏓 Zigzag · bilan"
              v={`${r.byTendance.zig.net >= 0 ? '+' : ''}${fmt(r.byTendance.zig.net)}`}
              cls={r.byTendance.zig.net >= 0 ? 'pos' : 'neg'}
            />
            <Metric
              k="🐉 Dragon (W/L)"
              v={`${r.byTendance.drag.wins}/${r.byTendance.drag.losses}`}
            />
            <Metric
              k="🐉 Dragon · bilan"
              v={`${r.byTendance.drag.net >= 0 ? '+' : ''}${fmt(r.byTendance.drag.net)}`}
              cls={r.byTendance.drag.net >= 0 ? 'pos' : 'neg'}
            />
            <Metric k="Égalités (push)" v={`${r.pushes}`} />
          </div>
        </>
      ) : (
        <>
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
        </>
      )}

      {r.busted && (
        <div className="risk" style={{ marginTop: 10 }}>
          💀 Bankroll épuisée au coup #{r.bustedAtHand}.
        </div>
      )}

      <Equity equity={r.equity} start={r.startStack} fmt={fmt} />
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
  const tpHit = reports.filter((r) => r.stoppedBy === 'tp').length;
  const slHit = reports.filter((r) => r.stoppedBy === 'sl').length;
  const anyStop = tpHit + slHit > 0;
  const avgPeak = avg((r) => r.maxStack - r.startStack);
  const avgDD = avg((r) => r.maxDrawdown);
  const avgLoseStreak = avg((r) => r.maxLoseStreak);
  return (
    <div style={{ marginTop: 14 }}>
      <div className="muted" style={{ marginBottom: 10 }}>
        Agrégé sur <strong>{n} simulations</strong>.
      </div>
      <div className="bt-grid">
        <Metric k="Bilan moyen" v={`${avgNet >= 0 ? '+' : ''}${fmt(avgNet)}`} cls={avgNet >= 0 ? 'pos' : 'neg'} accent />
        <Metric k="Sessions gagnantes" v={`${pos}/${n} (${pct(pos / n)})`} cls={pos / n >= 0.5 ? 'pos' : ''} />
        <Metric k="Sessions ruinées" v={`${busts}/${n} (${pct(busts / n)})`} cls={busts ? 'neg' : ''} />
        <Metric k="Meilleure" v={`+${fmt(best)}`} cls="pos" />
        <Metric k="Pire" v={fmt(worst)} cls="neg" />
        <Metric k="🚀 Pic moyen" v={`+${fmt(avgPeak)}`} cls="pos" />
        <Metric k="📉 Drawdown moyen" v={`-${fmt(avgDD)}`} />
        <Metric k="🩸 Série perdante moy." v={avgLoseStreak.toFixed(1)} />
        {anyStop && <Metric k="🎯 Take-profit touché" v={`${tpHit}/${n} (${pct(tpHit / n)})`} cls={tpHit ? 'pos' : ''} />}
        {anyStop && <Metric k="🛑 Stop-loss touché" v={`${slHit}/${n} (${pct(slHit / n)})`} cls={slHit ? 'neg' : ''} />}
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

function Equity({ equity, start, fmt }: { equity: number[]; start: number; fmt: (n: number) => string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(760);
  const [zoom, setZoom] = useState<{ lo: number; hi: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null); // index dans la fenêtre visible
  const [sel, setSel] = useState<{ a: number; b: number } | null>(null); // px pendant le glisser

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 760));
    ro.observe(el);
    setW(el.clientWidth || 760);
    return () => ro.disconnect();
  }, []);

  if (equity.length < 2) return null;

  const H = 180;
  const padL = 10;
  const padR = 10;
  const padT = 22;
  const padB = 20;
  const lo = zoom ? zoom.lo : 0;
  const hi = zoom ? zoom.hi : equity.length - 1;
  const view = equity.slice(lo, hi + 1);
  const n = view.length;
  const vmin = Math.min(start, ...view);
  const vmax = Math.max(start, ...view);
  const innerW = Math.max(1, w - padL - padR);
  const innerH = H - padT - padB;
  const xAt = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => padT + (1 - (v - vmin) / (vmax - vmin || 1)) * innerH;
  const pts = view.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ');
  const up = view[n - 1] >= start;

  // pic (max) et creux (min) de la fenêtre visible
  let pi = 0;
  let ti = 0;
  view.forEach((v, i) => {
    if (v > view[pi]) pi = i;
    if (v < view[ti]) ti = i;
  });

  const idxFromClient = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const px = clientX - rect.left;
    const frac = (px - padL) / innerW;
    return Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1))));
  };
  const onMove = (e: React.MouseEvent) => {
    const i = idxFromClient(e.clientX);
    setHover(i);
    if (sel) setSel({ a: sel.a, b: xAt(i) });
  };
  const onDown = (e: React.MouseEvent) => {
    const i = idxFromClient(e.clientX);
    setSel({ a: xAt(i), b: xAt(i) });
  };
  const onUp = (e: React.MouseEvent) => {
    if (sel) {
      const ia = idxFromClient(e.clientX);
      const a0 = Math.round(((sel.a - padL) / innerW) * (n - 1));
      const iMin = Math.max(0, Math.min(a0, ia));
      const iMax = Math.min(n - 1, Math.max(a0, ia));
      if (iMax - iMin >= 2) setZoom({ lo: lo + iMin, hi: lo + iMax });
      setSel(null);
    }
  };
  const leave = () => {
    setHover(null);
    setSel(null);
  };

  const label = (i: number, v: number, cls: string) => {
    const lx = Math.max(padL + 26, Math.min(w - padL - 26, xAt(i)));
    const above = yAt(v) > padT + 24;
    return (
      <g>
        <circle cx={xAt(i)} cy={yAt(v)} r={3.5} className={cls} />
        <text x={lx} y={above ? yAt(v) - 8 : yAt(v) + 15} textAnchor="middle" className={`eq-tag ${cls}`}>
          {fmt(v)}
        </text>
      </g>
    );
  };

  const hv = hover != null ? view[hover] : null;
  return (
    <div className="equity">
      <div className="road-label" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        ÉVOLUTION DE LA BANKROLL
        <span className="eq-hint">· glisse pour zoomer · {zoom ? `coups ${lo + 1}–${hi + 1}` : 'survole pour lire'}</span>
        {zoom && (
          <button className="chip-btn" style={{ marginLeft: 'auto' }} onClick={() => { setZoom(null); setHover(null); }}>
            ⤢ Réinitialiser le zoom
          </button>
        )}
      </div>
      <div className="eq-wrap" ref={wrapRef} style={{ position: 'relative' }}>
        <svg
          width={w}
          height={H}
          className="equity-svg"
          onMouseMove={onMove}
          onMouseDown={onDown}
          onMouseUp={onUp}
          onMouseLeave={leave}
          style={{ cursor: sel ? 'ew-resize' : 'crosshair' }}
        >
          <line x1={padL} y1={yAt(start)} x2={w - padR} y2={yAt(start)} stroke="rgba(255,255,255,0.22)" strokeDasharray="4 4" />
          <text x={w - padR} y={yAt(start) - 4} textAnchor="end" className="eq-base">départ {fmt(start)}</text>
          <polyline points={pts} fill="none" stroke={up ? 'var(--tie)' : 'var(--banker)'} strokeWidth="2" />
          {label(pi, view[pi], 'eq-peak')}
          {view[ti] < start && label(ti, view[ti], 'eq-trough')}
          {sel && (
            <rect x={Math.min(sel.a, sel.b)} y={padT} width={Math.abs(sel.b - sel.a)} height={innerH} className="eq-sel" />
          )}
          {hover != null && hv != null && (
            <g>
              <line x1={xAt(hover)} y1={padT} x2={xAt(hover)} y2={H - padB} className="eq-cross" />
              <circle cx={xAt(hover)} cy={yAt(hv)} r={4} className="eq-dot" />
            </g>
          )}
        </svg>
        {hover != null && hv != null && (
          <div
            className="eq-tip"
            style={{
              left: Math.max(4, Math.min(w - 150, xAt(hover) + 10)),
              top: Math.max(2, yAt(hv) - 46),
            }}
          >
            <div className="eq-tip-h">Coup #{lo + hover + 1}</div>
            <div>Bankroll : <strong>{fmt(hv)}</strong></div>
            <div className={hv - start >= 0 ? 'pos' : 'neg'}>
              {hv - start >= 0 ? '+' : ''}{fmt(hv - start)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
