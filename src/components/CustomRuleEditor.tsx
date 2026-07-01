import { useState } from 'react';
import { useMoney } from '../state/currency';
import type { CustomRule, RuleStep } from '../engine/types';

let idCounter = 0;
const newId = () => `rule_${Date.now().toString(36)}_${idCounter++}`;

/** Décrit une règle en français lisible. */
function describe(rule: CustomRule): string {
  const shape = rule.trigger
    .map((_, i) => (i === 0 ? 'une couleur' : rule.trigger[i] === rule.trigger[i - 1] ? 'la même' : 'une différente'))
    .join(', ');
  const steps = rule.steps
    .map((s, i) => `${i + 1}) ${s.bet === 'continue' ? 'suivre' : 'casser'} ${s.amount}`)
    .join(' → sinon ');
  return `Quand on voit [${shape}], miser : ${steps}.`;
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
  const [trigger, setTrigger] = useState<('R' | 'B')[]>([]);
  const [steps, setSteps] = useState<RuleStep[]>([{ bet: 'continue', amount: baseUnit }]);

  const addDot = (c: 'R' | 'B') => setTrigger((t) => [...t, c]);
  const popDot = () => setTrigger((t) => t.slice(0, -1));

  const setStep = (i: number, patch: Partial<RuleStep>) =>
    setSteps((s) => s.map((st, j) => (j === i ? { ...st, ...patch } : st)));
  const addStep = () => setSteps((s) => [...s, { bet: 'continue', amount: baseUnit }]);
  const removeStep = (i: number) => setSteps((s) => (s.length > 1 ? s.filter((_, j) => j !== i) : s));

  const canSave = name.trim().length > 0 && trigger.length >= 2 && steps.length >= 1;

  const save = () => {
    if (!canSave) return;
    onChange([...rules, { id: newId(), name: name.trim(), enabled: true, trigger, steps }]);
    setName('');
    setTrigger([]);
    setSteps([{ bet: 'continue', amount: baseUnit }]);
  };

  const loadPreset = () => {
    setName('Changement + 2 mêmes → 3e');
    setTrigger(['R', 'B', 'B']); // forme : une, différente, même
    setSteps([
      { bet: 'continue', amount: baseUnit },
      { bet: 'continue', amount: baseUnit * 2 },
    ]);
  };

  const toggle = (id: string) =>
    onChange(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  const del = (id: string) => onChange(rules.filter((r) => r.id !== id));

  return (
    <div className="panel">
      <h2>
        Patterns personnalisés <span className="sub">· tes propres signaux de mise</span>
      </h2>

      {/* Liste des règles existantes */}
      {rules.length > 0 ? (
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
                    {s.bet === 'continue' ? '↻' : '✕'} {money(s.amount)}
                  </span>
                ))}
              </div>
              <div className="muted rule-desc">{describe(r)}</div>
              <button className="link-btn" onClick={() => del(r.id)}>
                supprimer
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-note">Aucun pattern. Crée le tien ci-dessous.</div>
      )}

      {/* Éditeur */}
      <div className="rule-editor">
        <div className="coach-label" style={{ marginTop: 6 }}>NOUVEAU PATTERN</div>

        <div className="field">
          <label>Nom</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Changement + 2 mêmes" />
        </div>

        <div className="field">
          <label>
            Forme du signal <span className="muted">(rouge = Banquier, bleu = Joueur — la forme
            marche pour les deux couleurs)</span>
          </label>
          <div className="trigger-dots build">
            {trigger.length === 0 && <span className="muted">Ajoute des pastilles →</span>}
            {trigger.map((c, i) => (
              <span key={i} className={`tdot ${c}`} />
            ))}
          </div>
          <div className="btn-row" style={{ marginTop: 8 }}>
            <button className="btn b" onClick={() => addDot('R')}>+ Rouge (Banquier)</button>
            <button className="btn p" onClick={() => addDot('B')}>+ Bleu (Joueur)</button>
            <button className="btn" onClick={popDot} disabled={!trigger.length}>← Effacer</button>
            <button className="btn" onClick={() => setTrigger([])} disabled={!trigger.length}>Vider</button>
          </div>
        </div>

        <div className="field">
          <label>Progression de mise (étapes)</label>
          {steps.map((s, i) => (
            <div key={i} className="step-row">
              <span className="step-idx">{i + 1}</span>
              <select
                className="select"
                value={s.bet}
                onChange={(e) => setStep(i, { bet: e.target.value as RuleStep['bet'] })}
              >
                <option value="continue">Suivre (même couleur que le dernier)</option>
                <option value="break">Casser (couleur opposée)</option>
              </select>
              <input
                type="number"
                min={0}
                step={baseUnit}
                value={s.amount}
                onChange={(e) => setStep(i, { amount: Number(e.target.value) })}
              />
              <button className="btn" onClick={() => removeStep(i)} disabled={steps.length <= 1}>✕</button>
            </div>
          ))}
          <div className="hint">
            Étape 1 = mise dès que le signal apparaît. Si elle perd → étape 2, etc. Si une étape
            gagne → on encaisse et on repart. Après la dernière → STOP.
          </div>
          <button className="btn" style={{ marginTop: 8 }} onClick={addStep}>+ Ajouter une étape</button>
        </div>

        <div className="btn-row">
          <button className="btn gold" disabled={!canSave} onClick={save}>
            Ajouter le pattern
          </button>
          <button className="btn" onClick={loadPreset}>Charger l'exemple</button>
        </div>
      </div>
    </div>
  );
}
