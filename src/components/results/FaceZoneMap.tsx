import type { MetricResult } from '@/types/metrics';

interface FaceZoneMapProps {
  photoUrl: string;
  metrics: MetricResult[];
}

// MySkinAnalyzer — versión simplificada del mapa de zonas del MVP: muestra la
// foto principal con el score global superpuesto. La superposición de
// polígonos por región (ver faceRegions.ts) se activa en v2 junto con el
// reporte detallado por zona.
export default function FaceZoneMap({ photoUrl, metrics }: FaceZoneMapProps) {
  const overall = Math.round(metrics.reduce((s, m) => s + m.globalScore, 0) / (metrics.length || 1));
  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
      <img src={photoUrl} alt="Foto analizada" style={{ width: '100%', display: 'block' }} />
      <div
        style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(15,23,42,0.85)', color: 'white',
          borderRadius: 12, padding: '8px 14px', fontWeight: 700
        }}
      >
        {overall}/100
      </div>
    </div>
  );
}
