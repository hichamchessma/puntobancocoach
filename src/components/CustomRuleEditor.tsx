import { useMemo, useState } from 'react';
import { useMoney } from '../state/currency';
import type { BetNode, CustomRule } from '../engine/types';

let idCounter = 0;
const newId = () => `rule_${Date.now().toString(36)}_${idCounter++}`;

const ROWS = 6;
const COLS = 12;
const MAX_DEPTH = 5;
const key = (c: number, r: number) => `${c}_${r}`;
type Grid = Record<string, 'R' | 'B'>;

const freshNode = (baseUnit: number): BetNode => ({
  bet: 'continue',
  amount: baseUnit,
  onWin: 'stop',
  onLose: 'stop',
});

function readOrder(grid: Grid) {
  return Object.entries(grid)
    .map(([k, color]) => {
      const [c, r] = k.split('_').map(Number);
      return { col: c, row: r, color };
    })
    .sort((a, b) => a.col - b.col || a.row - b.row);
}

const betLabel = (b: 'continue' | 'break') => (b === 'continue' ? 'suivre' : 'casser');

function describe(node: BetNode, money: (n: number) => string): string {
  const w = node.onWin === 'stop' ? 'arrêt' : '…';
  const l = node.onLose === 'stop' ? 'arrêt' : '…';
  return `${betLabel(node.bet)} ${money(node.amount)} (gagné → ${w} · perdu → ${l})`;
}

/* ===== Éditeur récursif d'un nœud de mise ===== */
function BetNodeEditor({
  node,
  onChange,
  baseUnit,
  depth,
}: {
  node: BetNode;
  onChange: (n: BetNode) => void;
  baseUnit: number;
  depth: number;
}) {
  return (
    <div className="node-card">
      <div className="node-line">
        <span className="node-tag">Miser</span>
        <select
          className="select"
          value={node.bet}
          onChange={(e) => onChange({ ...node, bet: e.target.value as BetNode['bet'] })}
        >
          <option value="continue">Suivre (même couleur que le dernier)</option>
          <option value="break">Casser (couleur opposée)</option>
        </select>
        <input
          type="number"
          min={0}
          step={baseUnit}
          value={node.amount}
          onChange={(e) => onChange({ ...node, amount: Number(e.target.value) })}
        />
      </div>

      <Branch
        label="Si GAGNE"
        cls="win"
        branch={node.onWin}
        baseUnit={baseUnit}
        depth={depth}
        onChange={(b) => onChange({ ...node, onWin: b })}
      />
      <Branch
        label="Si PERD"
        cls="lose"
        branch={node.onLose}
        baseUnit={baseUnit}
        depth={depth}
        onChange={(b) => onChange({ ...node, onLose: b })}
      />
    </div>
  );
}

function Branch({
  label,
  cls,
  branch,
  baseUnit,
  depth,
  onChange,
}: {
  label: string;
  cls: 'win' | 'lose';
  branch: BetNode | 'stop';
  baseUnit: number;
  depth: number;
  onChange: (b: BetNode | 'stop') => void;
}) {
  return (
    <div className={`branch ${cls}`}>
      <div className="branch-head">
        <span className="branch-label">{label} →</span>
        {branch === 'stop' ? (
          <>
            <span className="branch-stop">Arrêter</span>
            {depth < MAX_DEPTH && (
              <button className="btn" onClick={() => onChange(freshNode(baseUnit))}>
                + Enchaîner une mise
              </button>
            )}
          </>
        ) : (
          <button className="btn" onClick={() => onChange('stop')}>
            ✕ Arrêter ici
          </button>
        )}
      </div>
      {branch !== 'stop' && (
        <BetNodeEditor node={branch} onChange={onChange} baseUnit={baseUnit} depth={depth + 1} />
      )}
    </div>
  );
}

/* ===== Éditeur principal ===== */
export function CustomRuleEditor({
  rules,
  baseUnit,
  onChange,
}: {
  rules: CustomRule[];
  baseUnit: number;
  onChange: (rules: CustomRule[]) => void;
}) {
  const money = useMoney();
  const [phase, setPhase] = useState<'draw' | 'bet'>('draw');
  const [name, setName] = useState('');
  const [brush, setBrush] = useState<'R' | 'B'>('R');
  const [grid, setGrid] = useState<Grid>({});
  const [root, setRoot] = useState<BetNode>(freshNode(baseUnit));
  const [err, setErr] = useState('');

  const seq = useMemo(() => readOrder(grid), [grid]);
  const trigger = seq.map((e) => e.color);

  // clic = poser / re-clic = effacer (booléen), sans passer par une gomme
  const click = (c: number, r: number) => {
    setGrid((g) => {
      const next = { ...g };
      if (next[key(c, r)]) delete next[key(c, r)];
      else next[key(c, r)] = brush;
      return next;
    });
  };

  const toBet = () => {
    if (trigger.length < 2) {
      setErr('Dessine au moins 2 pastilles pour le signal.');
      return;
    }
    setErr('');
    setPhase('bet');
  };

  const save = () => {
    if (trigger.length < 2) {
      setErr('Signal trop court.');
      return;
    }
    onChange([...rules, { id: newId(), name: name.trim() || 'Pattern', enabled: true, trigger, root }]);
    setName('');
    setGrid({});
    setRoot(freshNode(baseUnit));
    setPhase('draw');
  };

  const loadExample = () => {
    setName('Changement + 2 mêmes → 3e');
    setGrid({ [key(0, 0)]: 'R', [key(1, 0)]: 'B', [key(1, 1)]: 'B' });
    setRoot({
      bet: 'continue',
      amount: baseUnit,
      onWin: 'stop',
      onLose: { bet: 'continue', amount: baseUnit * 2, onWin: 'stop', onLose: 'stop' },
    });
    setPhase('draw');
  };

  const toggle = (id: string) =>
    onChange(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  const del = (id: string) => onChange(rules.filter((r) => r.id !== id));

  return (
    <div className="panel">
      <h2>
        Patterns personnalisés <span className="sub">· dessine le signal, puis l'arbre de mise</span>
      </h2>

      {rules.length > 0 && (
        <div className="rule-list">
          {rules.map((r) => (
            <div key={r.id} className={`rule-item ${r.enabled ? 'on' : ''}`}>
              <label className="toggle" style={{ color: 'var(--text)' }}>
                <input type="checkbox" checked={r.enabled} onChange={() => toggle(r.id)} />
                <strong>{r.name}</strong>
              </label>
              <div className="trigger-dots">
                {r.trigger.map((c, i) => (
                  <span key={i} className={`tdot ${c}`} />
                ))}
                <span className="rule-arrow">→</span>
                <span className="step-chip">{describe(r.root, money)}</span>
              </div>
              <button className="link-btn" onClick={() => del(r.id)}>
                supprimer
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="coach-label" style={{ marginTop: 6 }}>NOUVEAU PATTERN</div>
      <div className="field">
        <label>Nom</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Changement + 2 mêmes" />
      </div>

      {phase === 'draw' ? (
        <>
          <div className="brush-bar">
            <span className="muted">Couleur :</span>
            <button className={`brush b ${brush === 'R' ? 'on' : ''}`} onClick={() => setBrush('R')}>
              🔴 Rouge (Banquier)
            </button>
            <button className={`brush p ${brush === 'B' ? 'on' : ''}`} onClick={() => setBrush('B')}>
              🔵 Bleu (Joueur)
            </button>
            <button className="brush" onClick={() => setGrid({})}>Vider</button>
          </div>

          <div className="pattern-canvas" style={{ gridTemplateColumns: `repeat(${COLS}, 26px)` }}>
            {Array.from({ length: COLS }).flatMap((_, c) =>
              Array.from({ length: ROWS }).map((__, r) => {
                const cell = grid[key(c, r)];
                return (
                  <button
                    key={key(c, r)}
                    className={`pcell ${cell ?? ''}`}
                    style={{ gridColumn: c + 1, gridRow: r + 1 }}
                    onClick={() => click(c, r)}
                  />
                );
              }),
            )}
          </div>
          <div className="hint">
            Clique pour poser une pastille, re-clique dessus pour l'effacer. La forme est{' '}
            <strong>relative</strong> (marche pour rouge comme pour bleu).
          </div>

          {err && <div className="risk" style={{ marginTop: 8 }}>⚠ {err}</div>}
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn gold" onClick={toBet}>Valider le signal →</button>
            <button className="btn" onClick={loadExample}>Charger l'exemple</button>
          </div>
        </>
      ) : (
        <>
          <div className="field">
            <label>Signal (déclencheur)</label>
            <div className="trigger-dots build">
              {trigger.map((c, i) => (
                <span key={i} className={`tdot ${c}`} />
              ))}
              <span className="muted" style={{ marginLeft: 8 }}>puis on mise :</span>
            </div>
          </div>

          <div className="bet-tree">
            <BetNodeEditor node={root} onChange={setRoot} baseUnit={baseUnit} depth={0} />
          </div>

          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => setPhase('draw')}>← Modifier le signal</button>
            <button className="btn gold" onClick={save}>Enregistrer le pattern</button>
          </div>
        </>
      )}
    </div>
  );
}
