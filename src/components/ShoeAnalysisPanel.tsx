import { analyzeShoe } from '../engine/analysis';
import type { Outcome } from '../engine/types';

export function ShoeAnalysisPanel({ outcomes }: { outcomes: Outcome[] }) {
  const a = analyzeShoe(outcomes);
  const dots: ('R' | 'B' | 'none')[] = [
    a.last.bigEye ?? 'none',
    a.last.small ?? 'none',
    a.last.cockroach ?? 'none',
  ];

  return (
    <div>
      <div className="analysis-head">
        <span className={`reg-badge ${a.regularity}`}>SABOT {a.regularity.toUpperCase()}</span>
        <div className="conf-dots" title="Big Eye / Small / Cockroach (rouge = régulier)">
          {dots.map((d, i) => (
            <span key={i} className={`cd ${d}`} />
          ))}
        </div>
        <span className="muted">{a.reds}/3 rouge</span>
      </div>

      <div className="pattern-line">
        Motif détecté : <strong>{a.pattern.label}</strong>{' '}
        <span className="cn">{a.pattern.cnLabel}</span>
      </div>

      <ul className="tips">
        {a.tips.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
