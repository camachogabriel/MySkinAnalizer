import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSession } from '@/lib/storage/localSessionStore';
import MetricCard from '@/components/results/MetricCard';
import FaceZoneMap from '@/components/results/FaceZoneMap';
import ConfidenceBadge from '@/components/results/ConfidenceBadge';
import PrimaryButton from '@/components/common/PrimaryButton';
import MedicalDisclaimer from '@/components/common/MedicalDisclaimer';
import type { Session } from '@/types/session';

export default function ResultsScreen() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId).then((s) => {
      if (!s) return;
      setSession(s);
      const frontal = s.photos.find((p) => p.angle === 'frontal');
      if (frontal) setPhotoUrl(URL.createObjectURL(frontal.imageBlob));
    });
  }, [sessionId]);

  if (!session || !session.result) {
    return (
      <div className="msa-screen">
        <p>Cargando resultados...</p>
      </div>
    );
  }

  const { result } = session;

  return (
    <div className="msa-screen">
      {photoUrl && <FaceZoneMap photoUrl={photoUrl} metrics={result.metrics} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0' }}>
        <div>
          <div style={{ fontSize: 14, color: 'var(--msa-text-secondary)' }}>Puntuación general</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{result.overallScore}/100</div>
        </div>
        <ConfidenceBadge level={result.overallConfidence} />
      </div>

      {result.qualityWarning && (
        <div className="msa-card" style={{ background: '#FEF3C7', marginBottom: 16 }}>
          <p style={{ fontSize: 14, margin: 0 }}>{result.qualityWarning}</p>
        </div>
      )}

      {result.metrics.map((metric) => (
        <MetricCard key={metric.key} metric={metric} />
      ))}

      <PrimaryButton onClick={() => navigate('/')}>Volver al inicio</PrimaryButton>
      <MedicalDisclaimer />
    </div>
  );
}
