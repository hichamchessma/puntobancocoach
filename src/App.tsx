import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AdvicePanel } from './components/AdvicePanel';
import { BacktestView } from './components/BacktestView';
import { CasinoBet } from './components/CasinoBet';
import { CoachOverlay } from './components/CoachOverlay';
import { DealSpeedControl, msPerCard, type SpeedMode } from './components/DealSpeedControl';
import { HandArea, type Reveal } from './components/HandArea';
import { HistoryList } from './components/HistoryList';
import type { ToastData } from './components/ResultToast';
import { explainDerivedRoad } from './engine/analysis';
import type { DerivedKey } from './engine/roads';
import { Roads } from './components/Roads';
import { SessionStats } from './components/SessionStats';
import { SettingsModal } from './components/SettingsModal';
import { ShoeAnalysisPanel } from './components/ShoeAnalysisPanel';
import { StrategiesView } from './components/StrategiesView';
import { formatMoney } from './engine/money';
import type { Hand } from './engine/types';
import { CurrencyContext } from './state/currency';
import {
  createInitialState,
  reducer,
  selectAdvice,
  selectLastHand,
  selectOutcomes,
} from './state/session';

type View = 'play' | 'backtest' | 'strategies';

/** Ordre de sortie des cartes au casino : Joueur, Banquier, Joueur, Banquier, puis 3es cartes. */
function dealSlots(hand?: Hand): ('P' | 'B')[] {
  if (!hand?.player || !hand?.banker) return [];
  const o: ('P' | 'B')[] = ['P', 'B', 'P', 'B'];
  if (hand.player.length === 3) o.push('P');
  if (hand.banker.length === 3) o.push('B');
  return o;
}

function revealCounts(order: ('P' | 'B')[], n: number): Reveal {
  let player = 0;
  let banker = 0;
  for (let i = 0; i < n && i < order.length; i++) {
    if (order[i] === 'P') player++;
    else banker++;
  }
  return { player, banker };
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialState());
  const [view, setView] = useState<View>('play');
  const [showSettings, setShowSettings] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [helpMsg, setHelpMsg] = useState<{ title: string; body: string; canDeal?: boolean } | null>(
    null,
  );
  const [roadLetters, setRoadLetters] = useState(false);

  // Vitesse de distribution
  const [speedMode, setSpeedMode] = useState<SpeedMode>('progressive');
  const [speedLevel, setSpeedLevel] = useState(6);
  const [revealed, setRevealed] = useState(0);
  const timerRef = useRef<number | null>(null);
  // refs de vitesse pour la boucle d'auto-distribution (valeurs fraîches)
  const speedModeRef = useRef(speedMode);
  const speedLevelRef = useRef(speedLevel);
  speedModeRef.current = speedMode;
  speedLevelRef.current = speedLevel;

  // Toast résultat
  const [toast, setToast] = useState<ToastData | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const shownToastForId = useRef<number | null>(null);

  // Rejeu auto sur égalité (même mise)
  const tieTimerRef = useRef<number | null>(null);
  const tieHandledRef = useRef<number | null>(null);

  // Auto-distribution en maintenant Espace
  const holdTimerRef = useRef<number | null>(null);
  const autoDealRef = useRef<number | null>(null);
  const spaceDownRef = useRef(false);

  const outcomes = selectOutcomes(state);
  const advice = selectAdvice(state);
  const lastHand = selectLastHand(state);
  const { mode, betMode, pendingBet, config, stack, startStack, hands } = state;

  const order = dealSlots(lastHand);
  const total = order.length;
  const playable = view === 'play';

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Animation : révèle les cartes une par une à chaque nouvelle main simulée
  useEffect(() => {
    clearTimer();
    if (mode !== 'sim' || !lastHand?.player) return;
    if (speedMode === 'instant') {
      setRevealed(total);
      return;
    }
    setRevealed(0);
    let n = 0;
    timerRef.current = window.setInterval(() => {
      n += 1;
      setRevealed(n);
      if (n >= total) clearTimer();
    }, msPerCard(speedLevel));
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastHand?.id]);

  const shownSlots = speedMode === 'instant' ? total : revealed;
  const animating = mode === 'sim' && !!lastHand?.player && shownSlots < total;
  const reveal = lastHand?.player ? revealCounts(order, shownSlots) : undefined;
  const settled = !lastHand?.player || shownSlots >= total;

  const deal = useCallback(() => dispatch({ type: 'DEAL' }), []);
  const finishReveal = useCallback(() => {
    clearTimer();
    setRevealed(total);
  }, [clearTimer, total]);


  // Toast résultat : montré quand la main est finie
  useEffect(() => {
    if (!lastHand?.outcome) {
      setToast(null);
      return;
    }
    if (!settled) {
      setToast(null);
      if (toastTimerRef.current != null) clearTimeout(toastTimerRef.current);
      return;
    }
    if (shownToastForId.current === lastHand.id) return;
    shownToastForId.current = lastHand.id;

    let betText: string | undefined;
    let betWon: boolean | null | undefined;
    const bet = lastHand.bet;
    if (bet && bet.result) {
      if (bet.result === 'push') {
        betText = 'Mise rendue (égalité)';
        betWon = null;
      } else {
        const net = bet.net ?? 0;
        betText = `${net >= 0 ? '+' : ''}${formatMoney(net, config.currency)}`;
        betWon = bet.result === 'win';
      }
    }
    setToast({ id: lastHand.id, outcome: lastHand.outcome, natural: !!lastHand.natural, betText, betWon });
    if (toastTimerRef.current != null) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3000);
  }, [settled, lastHand?.id, lastHand?.outcome, lastHand?.natural, lastHand?.bet, config.currency]);

  // Égalité : on montre le résultat puis on relance automatiquement (même mise)
  useEffect(() => {
    if (tieTimerRef.current != null) {
      clearTimeout(tieTimerRef.current);
      tieTimerRef.current = null;
    }
    if (mode !== 'sim' || !settled || !lastHand || lastHand.outcome !== 'T') return;
    if (tieHandledRef.current === lastHand.id) return;
    tieHandledRef.current = lastHand.id;
    const bet = lastHand.bet; // mise du joueur (rendue en cas d'égalité)
    tieTimerRef.current = window.setTimeout(() => {
      if (betMode === 'manual' && bet) {
        dispatch({ type: 'SET_PENDING_BET', bet: { side: bet.side, amount: bet.amount } });
      }
      dispatch({ type: 'DEAL' });
    }, 1300);
  }, [settled, lastHand?.id, lastHand?.outcome, lastHand?.bet, mode, betMode]);

  const stopAutoDeal = useCallback(() => {
    if (holdTimerRef.current != null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (autoDealRef.current != null) {
      clearTimeout(autoDealRef.current);
      autoDealRef.current = null;
    }
  }, []);

  // Boucle d'auto-distribution tant que Espace est maintenu (cadence = durée
  // d'animation pour que chaque résultat sorte l'un après l'autre).
  const runAutoDeal = useCallback(() => {
    if (!spaceDownRef.current) {
      autoDealRef.current = null;
      return;
    }
    dispatch({ type: 'DEAL' });
    // cadence rapide, pilotée par le curseur de vitesse
    const cadence =
      speedModeRef.current === 'instant' ? 110 : Math.max(80, msPerCard(speedLevelRef.current));
    autoDealRef.current = window.setTimeout(runAutoDeal, cadence);
  }, []);

  // Raccourcis clavier (uniquement dans la vue Jouer, en simulateur)
  useEffect(() => {
    const inField = () => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select';
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!playable) return;
      if ((e.key === 's' || e.key === 'S') && !inField() && !showSettings) {
        e.preventDefault();
        setShowCoach((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        setShowCoach(false);
        return;
      }
      // A : retirer toute mise posée sur la table
      if ((e.key === 'a' || e.key === 'A') && !inField()) {
        e.preventDefault();
        dispatch({ type: 'SET_PENDING_BET', bet: null });
        return;
      }
      if (e.code !== 'Space') return;
      if (showSettings || showCoach || mode !== 'sim' || inField()) return;
      e.preventDefault();
      if (e.repeat) return;
      if (spaceDownRef.current) return;
      spaceDownRef.current = true;
      if (animating) finishReveal();
      else deal();
      // maintien -> distribution en continu (démarre vite)
      holdTimerRef.current = window.setTimeout(runAutoDeal, 350);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      spaceDownRef.current = false;
      stopAutoDeal();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [playable, mode, showSettings, showCoach, animating, finishReveal, deal, stopAutoDeal, runAutoDeal]);

  useEffect(() => {
    const onBlur = () => {
      spaceDownRef.current = false;
      stopAutoDeal();
    };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [stopAutoDeal]);

  // Bouton "Jouer / Help" : place la mise conseillée, ou explique pourquoi attendre
  const playNow = () => {
    if (advice.action === 'bet' && advice.side) {
      if (betMode !== 'manual') dispatch({ type: 'SET_BET_MODE', betMode: 'manual' });
      dispatch({ type: 'SET_PENDING_BET', bet: { side: advice.side, amount: advice.amount } });
      setHelpMsg({
        title: `Je joue : ${advice.side === 'P' ? 'JOUEUR' : 'BANQUIER'} · ${formatMoney(advice.amount, config.currency)}`,
        body: `${advice.reason}\n\nMise posée sur la table. ${mode === 'sim' ? 'Clique « Distribuer » (ou Espace) pour jouer le coup.' : 'Enregistre maintenant le résultat réel.'}`,
        canDeal: mode === 'sim',
      });
    } else {
      setHelpMsg({
        title: advice.action === 'stop' ? 'STOP — on ne joue pas' : 'ON ATTEND',
        body:
          advice.reason +
          (advice.action === 'wait'
            ? "\n\nNe pas jouer est aussi un bon coup : on garde la bankroll pour un vrai signal."
            : ''),
        canDeal: false,
      });
    }
  };

  const explainRoad = (which: DerivedKey) => {
    const { title, body } = explainDerivedRoad(which, outcomes);
    setHelpMsg({ title, body, canDeal: false });
  };

  const tabs: { id: View; label: string }[] = [
    { id: 'play', label: '🎴 Jouer' },
    { id: 'backtest', label: '📊 Backtest' },
    { id: 'strategies', label: '🎯 Stratégies' },
  ];

  return (
    <CurrencyContext.Provider value={config.currency}>
      <div className="app">
        <header className="topbar">
          <div className="brand-dot">♣</div>
          <h1>PUNTO BANCO COACH</h1>
          <button className="btn" onClick={() => setShowSettings(true)}>
            ⚙ Paramètres
          </button>
        </header>

        <nav className="tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`tab ${view === t.id ? 'active' : ''}`}
              onClick={() => setView(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {view === 'strategies' ? (
          <StrategiesView config={config} onSave={(patch) => dispatch({ type: 'SET_CONFIG', patch })} />
        ) : view === 'backtest' ? (
          <BacktestView config={config} />
        ) : (
          <div className="grid">
            {/* ===== Colonne principale ===== */}
            <div className="col">
              <div className="panel">
                <h2>
                  Table <span className="sub">· {mode === 'sim' ? 'Simulateur' : 'Mode casino'}</span>
                </h2>
                <HandArea hand={lastHand} mode={mode} reveal={reveal} settled={settled} toast={toast} />

                <div className="felt-banner">
                  <div className="fb-item">
                    <span className="fb-k">BANKROLL</span>
                    <span className="fb-v gold">{formatMoney(stack, config.currency)}</span>
                  </div>
                  <div className="fb-item">
                    <span className="fb-k">PROFIT</span>
                    <span className={`fb-v ${stack - startStack >= 0 ? 'pos' : 'neg'}`}>
                      {stack - startStack >= 0 ? '+' : ''}
                      {formatMoney(stack - startStack, config.currency)}
                    </span>
                  </div>
                  <div className="fb-rule">BANQUIER 6 = PAIE MOITIÉ</div>
                </div>

                <div className="controls" style={{ marginTop: 12 }}>
                  <div className="seg-toggle">
                    <button
                      className={mode === 'sim' ? 'active' : ''}
                      onClick={() => dispatch({ type: 'SET_MODE', mode: 'sim' })}
                    >
                      Simulateur
                    </button>
                    <button
                      className={mode === 'manual' ? 'active' : ''}
                      onClick={() => dispatch({ type: 'SET_MODE', mode: 'manual' })}
                    >
                      Mode casino
                    </button>
                  </div>
                  <div style={{ flex: 1 }} />
                  <button className="btn" onClick={() => dispatch({ type: 'UNDO' })} disabled={!hands.length}>
                    ↩ Annuler
                  </button>
                  <button className="btn" onClick={() => dispatch({ type: 'NEW_SHOE' })}>
                    ♻ Nouveau sabot
                  </button>
                </div>

                <CasinoBet
                  betMode={betMode}
                  pendingBet={pendingBet}
                  stack={stack}
                  maxBet={config.maxBet}
                  baseUnit={config.baseUnit}
                  advice={advice}
                  canDeal={mode === 'sim'}
                  onBetMode={(m) => dispatch({ type: 'SET_BET_MODE', betMode: m })}
                  onPlace={(bet) => dispatch({ type: 'SET_PENDING_BET', bet })}
                  onDeal={() => (animating ? finishReveal() : deal())}
                />

                {mode === 'sim' && (
                  <div className="controls" style={{ marginTop: 12 }}>
                    <DealSpeedControl mode={speedMode} level={speedLevel} onMode={setSpeedMode} onLevel={setSpeedLevel} />
                  </div>
                )}

                {mode === 'manual' && (
                  <div className="btn-row" style={{ marginTop: 12, alignItems: 'center' }}>
                    <span className="muted" style={{ marginRight: 6 }}>Résultat réel :</span>
                    <button className="btn p big" onClick={() => dispatch({ type: 'RECORD', outcome: 'P' })}>JOUEUR</button>
                    <button className="btn b big" onClick={() => dispatch({ type: 'RECORD', outcome: 'B' })}>BANQUIER</button>
                    <button className="btn t big" onClick={() => dispatch({ type: 'RECORD', outcome: 'T' })}>ÉGALITÉ</button>
                  </div>
                )}
              </div>
            </div>

            {/* ===== Colonne latérale ===== */}
            <div className="col">
              <div className="panel">
                <div className="panel-head">
                  <h2 style={{ margin: 0 }}>
                    Shoe History{' '}
                    <span className="sub">
                      · {outcomes.length}
                      {config.shoeHands > 0 ? `/${config.shoeHands}` : ''} coups
                    </span>
                  </h2>
                  <div className="btn-row">
                    <button className="btn" onClick={() => setRoadLetters((v) => !v)}>
                      {roadLetters ? '● Couleurs' : 'B / R Lettres'}
                    </button>
                    <button className="btn gold" onClick={playNow}>
                      ▶ Jouer maintenant / Help
                    </button>
                  </div>
                </div>
                <Roads outcomes={outcomes} onExplain={explainRoad} letters={roadLetters} />
              </div>

              <div className="panel">
                <h2>Statistiques de session</h2>
                <SessionStats stack={stack} startStack={startStack} config={config} hands={hands} outcomes={outcomes} />
              </div>

              <div className="panel">
                <h2>Conseil du prochain coup</h2>
                <AdvicePanel advice={advice} config={config} outcomes={outcomes} onDetails={() => setShowCoach(true)} />
              </div>

              <div className="panel">
                <h2>
                  Analyse du sabot <span className="sub">· style chinois</span>
                </h2>
                <ShoeAnalysisPanel outcomes={outcomes} />
              </div>

              <div className="panel">
                <h2>Historique des coups</h2>
                <HistoryList hands={hands} />
              </div>
            </div>
          </div>
        )}

        {helpMsg && (
          <div className="modal-back" onClick={() => setHelpMsg(null)}>
            <div className="help-pop" onClick={(e) => e.stopPropagation()}>
              <div className="help-title">{helpMsg.title}</div>
              <p className="help-body">{helpMsg.body}</p>
              <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                {helpMsg.canDeal && (
                  <button
                    className="btn gold"
                    onClick={() => {
                      setHelpMsg(null);
                      if (animating) finishReveal();
                      else deal();
                    }}
                  >
                    🂠 Distribuer
                  </button>
                )}
                <button className="btn" onClick={() => setHelpMsg(null)}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {showCoach && (
          <CoachOverlay advice={advice} config={config} outcomes={outcomes} onClose={() => setShowCoach(false)} />
        )}
        {showSettings && (
          <SettingsModal
            config={config}
            onSave={(patch) => dispatch({ type: 'SET_CONFIG', patch })}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </CurrencyContext.Provider>
  );
}
