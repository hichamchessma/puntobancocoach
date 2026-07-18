import { useEffect, useRef } from 'react';
import {
  buildBeadPlate,
  buildBigRoad,
  buildDerivedRoad,
  DERIVED_OFFSETS,
  placeColors,
  type DerivedKey,
} from '../engine/roads';
import type { Outcome } from '../engine/types';

const DERIVED_META: Record<DerivedKey, { label: string; cn: string }> = {
  bigEye: { label: 'Big Eye Boy', cn: '大眼仔' },
  small: { label: 'Small Road', cn: '小路' },
  cockroach: { label: 'Cockroach', cn: '曱甴路' },
};

/** Scrolle l'élément jusqu'à la fin à chaque nouveau coup (la barre permet de revenir en arrière). */
function useFollowEnd(len: number) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // suit le dernier résultat : scroll instantané à droite (et en bas si colonne longue)
    const follow = () => {
      el.scrollLeft = el.scrollWidth;
      el.scrollTop = el.scrollHeight;
    };
    follow();
    // 2e passe après layout, au cas où la largeur vient de changer
    const id = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(id);
  }, [len]);
  return ref;
}

export function Roads({
  outcomes,
  onExplain,
  letters = false,
}: {
  outcomes: Outcome[];
  onExplain?: (which: DerivedKey) => void;
  letters?: boolean; // affiche B/R au lieu des pastilles couleur (Big Road)
}) {
  const big = buildBigRoad(outcomes);
  const bead = buildBeadPlate(outcomes);
  const bigCols = Math.max(1, ...big.map((c) => c.col + 1));
  const beadCols = Math.max(1, ...bead.map((c) => c.col + 1));

  const bigRef = useFollowEnd(outcomes.length);
  const beadRef = useFollowEnd(outcomes.length);

  return (
    <div>
      <div className="road-block">
        <div className="road-label">BIG ROAD · 大路</div>
        <div className="road-grid" ref={bigRef} style={{ gridTemplateColumns: `repeat(${bigCols}, 18px)` }}>
          {big.map((c, i) => (
            <div
              key={i}
              className={`dot ${c.outcome === 'P' ? 'dot--bigP' : 'dot--bigB'} ${letters ? 'as-letter' : ''}`}
              style={{ gridColumn: c.col + 1, gridRow: c.row + 1 }}
              title={c.outcome === 'P' ? 'Joueur' : 'Banquier'}
            >
              {letters && (c.outcome === 'P' ? 'B' : 'R')}
              {c.ties > 0 && <span className="tie-slash">/</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="derived-row">
        {(Object.keys(DERIVED_META) as DerivedKey[]).map((k) => (
          <DerivedRoad key={k} outcomes={outcomes} which={k} onExplain={onExplain} />
        ))}
      </div>

      <div className="derived-legend" style={{ marginBottom: 10 }}>
        <span>
          <i style={{ background: 'var(--banker)' }} /> Rouge = régulier (le motif se répète)
        </span>
        <span>
          <i style={{ background: 'var(--player)' }} /> Bleu = irrégulier (chaotique)
        </span>
      </div>

      <div className="road-block">
        <div className="road-label">BEAD PLATE · 珠盤路</div>
        <div
          className="road-grid bead"
          ref={beadRef}
          style={{ gridTemplateColumns: `repeat(${beadCols}, 20px)` }}
        >
          {bead.map((c, i) => (
            <div
              key={i}
              className={`dot bead-${c.outcome}`}
              style={{ gridColumn: c.col + 1, gridRow: c.row + 1 }}
            >
              {c.outcome}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DerivedRoad({
  outcomes,
  which,
  onExplain,
}: {
  outcomes: Outcome[];
  which: DerivedKey;
  onExplain?: (which: DerivedKey) => void;
}) {
  const cells = placeColors(buildDerivedRoad(outcomes, DERIVED_OFFSETS[which]));
  const cols = Math.max(1, ...cells.map((c) => c.col + 1));
  const meta = DERIVED_META[which];
  const ref = useFollowEnd(outcomes.length);

  return (
    <div className="derived-col road-block">
      <div className="road-label">
        {meta.label} <span className="cn-tag">{meta.cn}</span>
        {onExplain && (
          <button className="road-explain" title="Expliquer cette road" onClick={() => onExplain(which)}>
            ?
          </button>
        )}
      </div>
      <div
        className="road-grid derived"
        ref={ref}
        style={{ gridTemplateColumns: `repeat(${cols}, 14px)` }}
      >
        {cells.map((c, i) => (
          <div
            key={i}
            className={`dot dot--${c.val}`}
            style={{ gridColumn: c.col + 1, gridRow: c.row + 1 }}
          />
        ))}
      </div>
    </div>
  );
}
