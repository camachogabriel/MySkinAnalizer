import type { MetricResult } from '@/types/metrics';
import ConfidenceBadge from './ConfidenceBadge';

function qualitativeLabel(score: number): string {
  if (score >= 85) return 'Excelente';
  if (score >= 70) return 'Bueno';
  if (score >= 50) return 'Mejorable';
  return 'Requiere atención';
}

export default function MetricCard({ metric }: { metric: MetricResult }) {
  return (
    <div className="msa-card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{metric.label}</strong>
        <ConfidenceBadge level={metric.confidence} />
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, margin: '8px 0' }}>
        {metric.globalScore}
        <span style={{ fontSize: 16, color: 'var(--msa-text-secondary)' }}>/100 · {qualitativeLabel(metric.globalScore)}</span>
      </div>
      <p style={{ fontSize: 14, color: 'var(--msa-text-secondary)', margin: '4px 0' }}>{metric.explanation}</p>
      <p style={{ fontSize: 12, color: 'var(--msa-text-secondary)', fontStyle: 'italic' }}>{metric.limitation}</p>
    </div>
  );
}
