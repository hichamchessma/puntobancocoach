import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AdvicePanel } from './components/AdvicePanel';
import { CoachOverlay } from './components/CoachOverlay';
import { DealSpeedControl, msPerCard, type SpeedMode } from './components/DealSpeedControl';
import { HandArea, type Reveal } from './components/HandArea';
import type { ToastData } from './components/ResultToast';
import { HistoryList } from './components/HistoryList';
import { Roads } from './components/Roads';
import { SessionStats } from './components/SessionStats';
import { ShoeAnalysisPanel } from './components/ShoeAnalysisPanel';
import { SettingsModal } from './components/SettingsModal';
import type { Hand } from './engine/types';
import {
  createInitialState,
  reducer,
  selectAdvice,
  selectLastHand,
  selectOutcomes,
} from './state/session';

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
  const [showSettings, setShowSettings] = useState(false);
  const [showCoach, setShowCoach] = useState(false);

  // Vitesse de distribution
  const [speedMode, setSpeedMode] = useState<SpeedMode>('progressive');
  const [speedLevel, setSpeedLevel] = useState(6); // semi-rapide
  const [revealed, setRevealed] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Toast résultat (overlay) : apparaît à la fin de la main, 3s, puis disparaît
  const [toast, setToast] = useState<ToastData | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const shownToastForId = useRef<number | null>(null);

  // Auto-distribution en maintenant Espace
  const holdTimerRef = useRef<number | null>(null);
  const autoDealRef = useRef<number | null>(null);
  const spaceDownRef = useRef(false);

  const outcomes = selectOutcomes(state);
  const advice = selectAdvice(state);
  const lastHand = selectLastHand(state);
  const { mode, followCoach, config, stack, startStack, hands } = state;

  const order = dealSlots(lastHand);
  const total = order.length;

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
    // on ne relance QUE sur une nouvelle main (changement d'id)
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

  // Toast résultat : montré quand la main est finie, masqué pendant la distribution
  useEffect(() => {
    if (mode !== 'sim' || !lastHand?.outcome) {
      setToast(null);
      return;
    }
    if (!settled) {
      // main en cours de distribution -> on cache l'annonce
      setToast(null);
      if (toastTimerRef.current != null) clearTimeout(toastTimerRef.current);
      return;
    }
    if (shownToastForId.current === lastHand.id) return; // déjà annoncé
    shownToastForId.current = lastHand.id;
    setToast({ id: lastHand.id, outcome: lastHand.outcome, natural: !!lastHand.natural });
    if (toastTimerRef.current != null) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3000);
  }, [settled, lastHand?.id, lastHand?.outcome, lastHand?.natural, mode]);

  const stopAutoDeal = useCallback(() => {
    if (holdTimerRef.current != null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (autoDealRef.current != null) {
      clearInterval(autoDealRef.current);
      autoDealRef.current = null;
    }
  }, []);

  // Raccourcis clavier : Espace = distribuer (maintenir ≥1,5s = auto), S = détail du coach
  useEffect(() => {
    const inField = () => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // S : ouvrir/fermer le conseil détaillé
      if ((e.key === 's' || e.key === 'S') && !inField() && !showSettings) {
        e.preventDefault();
        setShowCoach((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        setShowCoach(false);
        return;
      }

      if (e.code !== 'Space') return;
      if (showSettings || showCoach || mode !== 'sim' || inField()) return;
      e.preventDefault();
      if (e.repeat) return; // on ignore la répétition de l'OS, on gère nous-mêmes
      if (spaceDownRef.current) return;
      spaceDownRef.current = true;

      // action immédiate au 1er appui
      if (animating) finishReveal();
      else deal();

      // maintien ≥ 1,5 s -> distribution en continu jusqu'au relâchement
      holdTimerRef.current = window.setTimeout(() => {
        autoDealRef.current = window.setInterval(() => {
          dispatch({ type: 'DEAL' });
        }, 420);
      }, 1500);
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
  }, [mode, showSettings, showCoach, animating, finishReveal, deal, stopAutoDeal]);

  // Sécurité : on coupe l'auto-distribution si la fenêtre perd le focus
  useEffect(() => {
    const onBlur = () => {
      spaceDownRef.current = false;
      stopAutoDeal();
    };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [stopAutoDeal]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-dot">♣</div>
        <h1>PUNTO BANCO COACH</h1>
        <button className="btn" onClick={() => setShowSettings(true)}>
          ⚙ Paramètres
        </button>
      </header>

      <div className="grid">
        {/* ===== Colonne principale ===== */}
        <div className="col">
          <div className="panel">
            <h2>
              Table <span className="sub">· {mode === 'sim' ? 'Simulateur' : 'Mode casino'}</span>
            </h2>
            <HandArea hand={lastHand} mode={mode} reveal={reveal} settled={settled} toast={toast} />

            <div className="controls" style={{ marginTop: 14 }}>
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

              <label className="toggle">
                <input
                  type="checkbox"
                  checked={followCoach}
                  onChange={() => dispatch({ type: 'TOGGLE_FOLLOW' })}
                />
                Suivre le coach
              </label>

              <div style={{ flex: 1 }} />

              <button className="btn" onClick={() => dispatch({ type: 'UNDO' })} disabled={!hands.length}>
                ↩ Annuler
              </button>
              <button className="btn" onClick={() => dispatch({ type: 'NEW_SHOE' })}>
                ♻ Nouveau sabot
              </button>
            </div>

            {mode === 'sim' && (
              <div className="controls" style={{ marginTop: 12 }}>
                <DealSpeedControl
                  mode={speedMode}
                  level={speedLevel}
                  onMode={setSpeedMode}
                  onLevel={setSpeedLevel}
                />
              </div>
            )}

            {mode === 'sim' ? (
              <button className="btn gold big" style={{ marginTop: 12 }} onClick={() => (animating ? finishReveal() : deal())}>
                {animating ? '⏭ Voir le résultat' : '🂠 Distribuer la main suivante'}{' '}
                <span className="kbd">Espace</span>
              </button>
            ) : (
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button className="btn p big" onClick={() => dispatch({ type: 'RECORD', outcome: 'P' })}>
                  JOUEUR
                </button>
                <button className="btn b big" onClick={() => dispatch({ type: 'RECORD', outcome: 'B' })}>
                  BANQUIER
                </button>
                <button className="btn t big" onClick={() => dispatch({ type: 'RECORD', outcome: 'T' })}>
                  ÉGALITÉ
                </button>
              </div>
            )}
          </div>

          <div className="panel">
            <h2>
              Shoe History <span className="sub">· {outcomes.length} coups</span>
            </h2>
            <Roads outcomes={outcomes} />
          </div>
        </div>

        {/* ===== Colonne latérale ===== */}
        <div className="col">
          <div className="panel">
            <h2>Statistiques de session</h2>
            <SessionStats
              stack={stack}
              startStack={startStack}
              config={config}
              hands={hands}
              outcomes={outcomes}
            />
          </div>

          <div className="panel">
            <h2>Conseil du prochain coup</h2>
            <AdvicePanel
              advice={advice}
              config={config}
              outcomes={outcomes}
              onDetails={() => setShowCoach(true)}
            />
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

      {showCoach && (
        <CoachOverlay
          advice={advice}
          config={config}
          outcomes={outcomes}
          onClose={() => setShowCoach(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          config={config}
          onSave={(patch) => dispatch({ type: 'SET_CONFIG', patch })}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
