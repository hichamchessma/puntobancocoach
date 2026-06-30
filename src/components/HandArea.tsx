import type { Card, Hand } from '../engine/types';
import { PlayingCard } from './PlayingCard';
import { ResultToast, type ToastData } from './ResultToast';

export interface Reveal {
  player: number;
  banker: number;
}

export function HandArea({
  hand,
  mode,
  reveal,
  settled = true,
  toast,
}: {
  hand?: Hand;
  mode: 'sim' | 'manual';
  reveal?: Reveal; // si fourni : on n'affiche que N cartes (animation)
  settled?: boolean; // toutes les cartes sont sorties -> on peut afficher le résultat
  toast?: ToastData | null; // annonce du résultat (overlay)
}) {
  const outcome = hand?.outcome;

  if (mode === 'manual') {
    return (
      <div className="table">
        <div className="table-row">
          <div className="hand-box" style={{ textAlign: 'center' }}>
            {outcome ? (
              <>
                <div className="hand-title" style={{ marginBottom: 8 }}>
                  DERNIER RÉSULTAT
                </div>
                <div
                  className={`badge-side ${outcome === 'P' ? 'player' : outcome === 'B' ? 'banker' : 'tie'}`}
                  style={{ fontSize: 22, padding: 16 }}
                >
                  {outcome === 'P' ? 'JOUEUR' : outcome === 'B' ? 'BANQUIER' : 'ÉGALITÉ'}
                </div>
              </>
            ) : (
              <div className="empty-note">
                Mode casino : saisis les résultats de la table avec les boutons ci-dessous.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const showOutcome = outcome && settled;

  return (
    <div className="table">
      <div className="table-row">
        <HandBox
          title="JOUEUR"
          side="player"
          cards={hand?.player}
          shown={reveal ? reveal.player : hand?.player?.length ?? 0}
          value={hand?.playerValue}
          win={showOutcome ? outcome === 'P' : false}
        />
        <HandBox
          title="BANQUIER"
          side="banker"
          cards={hand?.banker}
          shown={reveal ? reveal.banker : hand?.banker?.length ?? 0}
          value={hand?.bankerValue}
          win={showOutcome ? outcome === 'B' : false}
        />
      </div>
      <ResultToast toast={toast ?? null} />
    </div>
  );
}

function HandBox({
  title,
  side,
  cards,
  shown,
  value,
  win,
}: {
  title: string;
  side: 'player' | 'banker';
  cards?: Card[];
  shown: number; // nb de cartes à afficher
  value?: number;
  win?: boolean;
}) {
  const visible = cards ? cards.slice(0, shown) : [];
  const complete = !!cards && shown >= cards.length;
  const base = visible.slice(0, 2);
  const third = visible[2]; // la 3e carte, tirée horizontalement au-dessus

  return (
    <div className={`hand-box ${win ? 'win' : ''}`}>
      <div className="hand-head">
        <span className={`hand-title ${side}`}>{title}</span>
        <span className="hand-value">{complete && value !== undefined ? value : '—'}</span>
      </div>
      <div className="hand-cards">
        {/* La 3e carte : couchée (horizontale), posée au-dessus comme au casino */}
        <div className="third-slot">{third && <PlayingCard card={third} third />}</div>
        <div className="base-cards">
          {base.length > 0 ? (
            base.map((c, i) => <PlayingCard key={i} card={c} />)
          ) : (
            <>
              <div className="card--empty" />
              <div className="card--empty" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
