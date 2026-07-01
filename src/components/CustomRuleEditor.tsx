import { useMemo, useState } from 'react';
import { useMoney } from '../state/currency';
import type { CustomRule, Side } from '../engine/types';
import { MiniRoad } from './MiniRoad';

let idCounter = 0;
const newId = () => `rule_${Date.now().toString(36)}_${idCounter++}`;

const ROWS = 6;
const COLS = 12;
const CELL = 26;
const GAP = 3;
const STEP = CELL + GAP;
const key = (c: number, r: number) => `${c}_${r}`;

type Color = 'R' | 'B'; // R = rouge (Banquier), B = bleu (Joueur)
const colorToSide = (c: Color): Side => (c === 'R' ? 'B' : 'P');
interface Cell {
  color: Color;
  bet?: { color: Color; amount: number };
}
type Grid = Record<string, Cell>;
type Brush = 'R' | 'B' | 'bet';

function readOrder(grid: Grid) {
  return Object.entries(grid)
    .map(([k, v]) => {
      const [c, r] = k.split('_').map(Number);
      return { col: c, row: r, key: k, ...v };
    })
    .sort((a, b) => a.col - b.col || a.row - b.row);
}

function gridToRule(grid: Grid, name: string): CustomRule | string {
  const seq = readOrder(grid);
  if (seq.length === 0) return 'Dessine le signal (pastilles rouge/bleu).';
  const betIdx = seq.map((e, i) => (e.bet ? i : -1)).filter((i) => i >= 0);
  if (betIdx.length === 0) return 'Passe en « Entrer mise » et clique une pastille pour définir une mise.';
  const trigger: Side[] = seq.slice(0, betIdx[0]).map((e) => colorToSide(e.color));
  const steps = betIdx.map((i) => ({ side: colorToSide(seq[i].bet!.color), amount: seq[i].bet!.amount }));
  return { id: newId(), name: name.trim() || 'Pattern', enabled: true, trigger, steps };
}

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
  const [name, setName] = useState('');
  const [brush, setBrush] = useState<Brush>('R');
  const [grid, setGrid] = useState<Grid>({});
  const [editing, setEditing] = useState<{ c: number; r: number } | null>(null);
  const [err, setErr] = useState('');

  const seq = useMemo(() => readOrder(grid), [grid]);
  const betCells = seq.filter((e) => e.bet);

  const click = (c: number, r: number) => {
    setErr('');
    const k = key(c, r);
    if (brush === 'bet') {
      if (!grid[k]) return; // pas de pastille ici
      setGrid((g) =>
        g[k].bet ? g : { ...g, [k]: { ...g[k], bet: { color: g[k].color, amount: baseUnit } } },
      );
      setEditing({ c, r });
      return;
    }
    // R / B : clic pose, re-clic efface
    setEditing(null);
    setGrid((g) => {
      const next = { ...g };
      if (next[k]) delete next[k];
      else next[k] = { color: brush };
      return next;
    });
  };

  const setBet = (patch: Partial<{ color: Color; amount: number }>) => {
    if (!editing) return;
    const k = key(editing.c, editing.r);
    setGrid((g) => ({ ...g, [k]: { ...g[k], bet: { ...g[k].bet!, ...patch } } }));
  };
  const removeBet = () => {
    if (!editing) return;
    const k = key(editing.c, editing.r);
    setGrid((g) => ({ ...g, [k]: { color: g[k].color } }));
    setEditing(null);
  };

  const pickBrush = (b: Brush) => {
    setBrush(b);
    setEditing(null);
  };

  const save = () => {
    const res = gridToRule(grid, name);
    if (typeof res === 'string') return setErr(res);
    onChange([...rules, res]);
    setName('');
    setGrid({});
    setEditing(null);
  };

  const loadExample = () => {
    setName('Changement + 2 mêmes → 3e');
    setGrid({
      [key(0, 0)]: { color: 'R' },
      [key(1, 0)]: { color: 'B' },
      [key(1, 1)]: { color: 'B' },
      [key(1, 2)]: { color: 'B', bet: { color: 'B', amount: baseUnit } },
    });
    setBrush('bet');
  };

  const toggle = (id: string) =>
    onChange(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  const del = (id: string) => onChange(rules.filter((r) => r.id !== id));

  const editingCell = editing ? grid[key(editing.c, editing.r)] : null;
  const popLeft = editing ? Math.min(editing.c * STEP + 34, COLS * STEP - 214) : 0;
  const popTop = editing ? editing.r * STEP : 0;

  return (
    <div className="panel">
      <h2>
        Patterns personnalisés <span className="sub">· dessine le signal, clique pour miser</span>
      </h2>

      {/* Règles enregistrées */}
      {rules.length > 0 && (
        <div className="rule-list">
          {rules.map((r) => (
            <div key={r.id} className={`rule-item ${r.enabled ? 'on' : ''}`}>
              <label className="toggle" style={{ color: 'var(--text)' }}>
                <input type="checkbox" checked={r.enabled} onChange={() => toggle(r.id)} />
                <strong>{r.name}</strong>
              </label>
              <div className="rule-visual">
                <MiniRoad trigger={r.trigger} bets={r.steps} />
                <div className="rule-amounts">
                  {r.steps.map((s, i) => (
                    <span key={i} className="step-chip">
                      {i > 0 && <span className="rule-arrow">→</span>}
                      <span className={`tdot mini ${s.side === 'B' ? 'R' : 'B'}`} /> {money(s.amount)}
                    </span>
                  ))}
                </div>
              </div>
              <button className="link-btn" onClick={() => del(r.id)}>supprimer</button>
            </div>
          ))}
        </div>
      )}

      <div className="coach-label" style={{ marginTop: 6 }}>NOUVEAU PATTERN</div>
      <div className="field">
        <label>Nom</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Changement + 2 mêmes" />
      </div>

      <div className="brush-bar">
        <button className={`brush b ${brush === 'R' ? 'on' : ''}`} onClick={() => pickBrush('R')}>🔴 Rouge</button>
        <button className={`brush p ${brush === 'B' ? 'on' : ''}`} onClick={() => pickBrush('B')}>🔵 Bleu</button>
        <button className={`brush g ${brush === 'bet' ? 'on' : ''}`} onClick={() => pickBrush('bet')}>🎯 Entrer mise</button>
        <button className="brush" onClick={() => { setGrid({}); setEditing(null); }}>Vider</button>
      </div>

      {/* Canvas + popover */}
      <div className="canvas-wrap">
        <div className="pattern-canvas" style={{ gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`, width: COLS * STEP }}>
          {Array.from({ length: COLS }).flatMap((_, c) =>
            Array.from({ length: ROWS }).map((__, r) => {
              const cell = grid[key(c, r)];
              const isEd = editing?.c === c && editing?.r === r;
              return (
                <button
                  key={key(c, r)}
                  className={`pcell ${cell ? cell.color : ''} ${cell?.bet ? 'bet' : ''} ${isEd ? 'editing' : ''}`}
                  style={{ gridColumn: c + 1, gridRow: r + 1 }}
                  onClick={() => click(c, r)}
                >
                  {cell?.bet ? '🎯' : ''}
                </button>
              );
            }),
          )}
        </div>

        {editing && editingCell?.bet && (
          <div className="bet-pop" style={{ left: Math.max(0, popLeft), top: popTop }}>
            <div className="bet-pop-title">Mise sur ce résultat</div>
            <div className="bet-pop-row">
              <span className="muted">Couleur :</span>
              <button
                className={`chip-btn ${editingCell.bet.color === 'R' ? 'on' : ''}`}
                onClick={() => setBet({ color: 'R' })}
              >🔴 Rouge</button>
              <button
                className={`chip-btn ${editingCell.bet.color === 'B' ? 'on' : ''}`}
                onClick={() => setBet({ color: 'B' })}
              >🔵 Bleu</button>
            </div>
            <div className="bet-pop-row">
              <span className="muted">Montant :</span>
              <input
                type="number"
                min={0}
                step={baseUnit}
                value={editingCell.bet.amount}
                onChange={(e) => setBet({ amount: Number(e.target.value) })}
                autoFocus
              />
            </div>
            <div className="bet-pop-row" style={{ justifyContent: 'space-between' }}>
              <button className="link-btn" onClick={removeBet}>retirer</button>
              <button className="btn gold" onClick={() => setEditing(null)}>OK</button>
            </div>
          </div>
        )}
      </div>

      <div className="hint">
        Clique pour poser une pastille (re-clique = effacer). Passe en <strong>🎯 Entrer mise</strong>{' '}
        et clique une pastille pour miser dessus (couleur + montant). Plusieurs mises = progression
        (si une perd → la suivante ; gagne → on encaisse).
      </div>

      {/* Récap des mises */}
      {betCells.length > 0 && (
        <div className="muted" style={{ marginTop: 8 }}>
          Mises :{' '}
          {betCells.map((e, i) => (
            <span key={e.key}>
              {i > 0 && ' → '}
              {i + 1}) <span className={`tdot mini ${e.bet!.color}`} /> {money(e.bet!.amount)}
            </span>
          ))}
        </div>
      )}

      {err && <div className="risk" style={{ marginTop: 8 }}>⚠ {err}</div>}

      <div className="btn-row" style={{ marginTop: 12 }}>
        <button className="btn gold" onClick={save}>Enregistrer le pattern</button>
        <button className="btn" onClick={loadExample}>Charger l'exemple</button>
      </div>
    </div>
  );
}
