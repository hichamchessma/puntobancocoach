import type { Card, Hand } from '../engine/types';
import { PlayingCard } from './PlayingCard';

export interface Reveal {
  player: number;
  banker: number;
}

export function HandArea({
  hand,
  mode,
  reveal,
  settled = true,
}: {
  hand?: Hand;
  mode: 'sim' | 'manual';
  reveal?: Reveal; // si fourni : on n'affiche que N cartes (animation)
  settled?: boolean; // toutes les cartes sont sorties -> on peut afficher le résultat
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
          natural={hand?.natural && outcome === 'P' && settled}
        />
        <HandBox
          title="BANQUIER"
          side="banker"
          cards={hand?.banker}
          shown={reveal ? reveal.banker : hand?.banker?.length ?? 0}
          value={hand?.bankerValue}
          win={showOutcome ? outcome === 'B' : false}
          natural={hand?.natural && outcome === 'B' && settled}
        />
      </div>
      {showOutcome && (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <span
            className={`badge-side ${outcome === 'P' ? 'player' : outcome === 'B' ? 'banker' : 'tie'}`}
            style={{ display: 'inline-block', padding: '8px 22px' }}
          >
            {outcome === 'P' ? 'JOUEUR GAGNE' : outcome === 'B' ? 'BANQUIER GAGNE' : 'ÉGALITÉ'}
            {hand?.natural ? ' • NATUREL' : ''}
          </span>
        </div>
      )}
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
  natural,
}: {
  title: string;
  side: 'player' | 'banker';
  cards?: Card[];
  shown: number; // nb de cartes à afficher
  value?: number;
  win?: boolean;
  natural?: boolean;
}) {
  const visible = cards ? cards.slice(0, shown) : [];
  const complete = !!cards && shown >= cards.length;

  return (
    <div className={`hand-box ${win ? 'win' : ''}`}>
      <div className="hand-head">
        <span className={`hand-title ${side}`}>{title}</span>
        <span className="hand-value">{complete && value !== undefined ? value : '—'}</span>
      </div>
      <div className="hand-cards">
        {visible.length > 0 ? (
          visible.map((c, i) => <PlayingCard key={i} card={c} />)
        ) : (
          <>
            <div className="card--empty" />
            <div className="card--empty" />
          </>
        )}
      </div>
      {natural && (
        <div style={{ color: 'var(--gold)', fontSize: 12, marginTop: 6, fontWeight: 700 }}>
          NATUREL
        </div>
      )}
    </div>
  );
}
