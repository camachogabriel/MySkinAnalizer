import type { ConfidenceLevel } from '@/types/metrics';

const LABELS: Record<ConfidenceLevel, string> = {
  low: 'Confianza baja',
  medium: 'Confianza media',
  high: 'Confianza alta'
};

const COLORS: Record<ConfidenceLevel, string> = {
  low: '#DC2626',
  medium: '#F59E0B',
  high: '#16A34A'
};

export default function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: COLORS[level],
        background: `${COLORS[level]}1A`,
        padding: '4px 10px',
        borderRadius: 999
      }}
    >
      {LABELS[level]}
    </span>
  );
}
