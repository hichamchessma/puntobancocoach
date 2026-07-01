import { useMemo, useState } from 'react';
import { useMoney } from '../state/currency';
import type { CustomRule } from '../engine/types';

let idCounter = 0;
const newId = () => `rule_${Date.now().toString(36)}_${idCounter++}`;

const ROWS = 6;
const COLS = 12;
const key = (c: number, r: number) => `${c}_${r}`;

type Brush = 'R' | 'B' | 'bet' | 'erase';
interface Cell {
  color: 'R' | 'B';
  bet?: number; // montant si c'est un point de mise
}
type Grid = Record<string, Cell>;

/** Lit la grille en ordre Big Road (colonne par colonne, de haut en bas). */
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
  if (seq.length < 2) return 'Dessine au moins 2 pastilles.';
  const betIdx = seq.map((e, i) => (e.bet != null ? i : -1)).filter((i) => i >= 0);
  if (betIdx.length === 0) return 'Clique un point (pinceau 🎯) pour définir où tu mises.';
  if (betIdx[0] < 2) return 'Le 1er point de mise doit venir après au moins 2 pastilles de signal.';
  const trigger = seq.slice(0, betIdx[0]).map((e) => e.color);
  const steps = betIdx.map((i) => ({
    bet: (seq[i].color === seq[i - 1].color ? 'continue' : 'break') as 'continue' | 'break',
    amount: seq[i].bet!,
  }));
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
  const [err, setErr] = useState('');

  const seq = useMemo(() => readOrder(grid), [grid]);
  const betOrder = useMemo(() => {
    const order = new Map<string, number>();
    seq.filter((e) => e.bet != null).forEach((e, i) => order.set(e.key, i + 1));
    return order;
  }, [seq]);

  const click = (c: number, r: number) => {
    setErr('');
    setGrid((g) => {
      const next = { ...g };
      const cell = next[key(c, r)];
      if (brush === 'erase') delete next[key(c, r)];
      else if (brush === 'bet') {
        if (cell) next[key(c, r)] = { ...cell, bet: cell.bet != null ? undefined : baseUnit };
      } else next[key(c, r)] = { color: brush, bet: cell?.bet };
      return next;
    });
  };

  const setBetAmount = (k: string, amount: number) =>
    setGrid((g) => ({ ...g, [k]: { ...g[k], bet: amount } }));
  const removeBet = (k: string) => setGrid((g) => ({ ...g, [k]: { color: g[k].color } }));

  const save = () => {
    const res = gridToRule(grid, name);
    if (typeof res === 'string') {
      setErr(res);
      return;
    }
    onChange([...rules, res]);
    setName('');
    setGrid({});
  };

  const loadExample = () => {
    setName('Changement + 2 mêmes → 3e');
    setGrid({
      [key(0, 0)]: { color: 'R' },
      [key(1, 0)]: { color: 'B' },
      [key(1, 1)]: { color: 'B' },
      [key(1, 2)]: { color: 'B', bet: baseUnit },
    });
    setBrush('bet');
  };

  const toggle = (id: string) =>
    onChange(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  const del = (id: string) => onChange(rules.filter((r) => r.id !== id));

  const betSteps = seq.filter((e) => e.bet != null);

  return (
    <div className="panel">
      <h2>
        Patterns personnalisés <span className="sub">· dessine ton signal sur la grille</span>
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
              <div className="trigger-dots">
                {r.trigger.map((c, i) => (
                  <span key={i} className={`tdot ${c}`} />
                ))}
                <span className="rule-arrow">→</span>
                {r.steps.map((s, i) => (
                  <span key={i} className="step-chip">
                    {s.bet === 'continue' ? '↻ suivre' : '✕ casser'} {money(s.amount)}
                  </span>
                ))}
              </div>
              <button className="link-btn" onClick={() => del(r.id)}>
                supprimer
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Éditeur graphique */}
      <div className="coach-label" style={{ marginTop: 6 }}>NOUVEAU PATTERN</div>

      <div className="field">
        <label>Nom</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Changement + 2 mêmes" />
      </div>

      {/* Barre de pinceaux */}
      <div className="brush-bar">
        <span className="muted">Pinceau :</span>
        <button className={`brush b ${brush === 'R' ? 'on' : ''}`} onClick={() => setBrush('R')}>🔴 Rouge (Banquier)</button>
        <button className={`brush p ${brush === 'B' ? 'on' : ''}`} onClick={() => setBrush('B')}>🔵 Bleu (Joueur)</button>
        <button className={`brush g ${brush === 'bet' ? 'on' : ''}`} onClick={() => setBrush('bet')}>🎯 Point de mise</button>
        <button className={`brush ${brush === 'erase' ? 'on' : ''}`} onClick={() => setBrush('erase')}>🩹 Gomme</button>
        <button className="brush" onClick={() => setGrid({})}>Vider</button>
      </div>

      {/* Canvas Big Road cliquable */}
      <div className="pattern-canvas" style={{ gridTemplateColumns: `repeat(${COLS}, 26px)` }}>
        {Array.from({ length: COLS }).flatMap((_, c) =>
          Array.from({ length: ROWS }).map((__, r) => {
            const cell = grid[key(c, r)];
            const step = betOrder.get(key(c, r));
            return (
              <button
                key={key(c, r)}
                className={`pcell ${cell ? cell.color : ''} ${cell?.bet != null ? 'bet' : ''}`}
                style={{ gridColumn: c + 1, gridRow: r + 1 }}
                onClick={() => click(c, r)}
                title={cell?.bet != null ? `Point de mise ${step}` : ''}
              >
                {step ?? ''}
              </button>
            );
          }),
        )}
      </div>
      <div className="hint">
        Clique 🔴/🔵 pour poser le motif (comme la Big Road), puis passe en 🎯 et clique le(s)
        point(s) où tu commences à miser. La forme est <strong>relative</strong> : elle marche pour
        rouge comme pour bleu.
      </div>

      {/* Étapes de mise (auto depuis les points 🎯) */}
      {betSteps.length > 0 && (
        <div className="field" style={{ marginTop: 12 }}>
          <label>Mises (dans l'ordre — si une perd, on passe à la suivante)</label>
          {betSteps.map((e, i) => {
            const idx = seq.indexOf(e);
            const label =
              idx > 0
                ? seq[idx].color === seq[idx - 1].color
                  ? 'suivre (même couleur)'
                  : 'casser (couleur opposée)'
                : '—';
            return (
              <div key={e.key} className="step-row">
                <span className="step-idx">{i + 1}</span>
                <span className="step-desc">
                  <span className={`tdot ${e.color}`} /> {label}
                </span>
                <input
                  type="number"
                  min={0}
                  step={baseUnit}
                  value={e.bet}
                  onChange={(ev) => setBetAmount(e.key, Number(ev.target.value))}
                />
                <button className="btn" onClick={() => removeBet(e.key)} title="Retirer ce point">✕</button>
              </div>
            );
          })}
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
