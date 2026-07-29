import type { AnalysisResult, MetricResult } from '@/types/metrics';

// MySkinAnalyzer — empaquetado del resultado final (sección 17 del brief).

const DISCLAIMER =
  'MySkinAnalyzer ofrece una evaluación visual orientativa basada en fotografías. ' +
  'No sustituye el diagnóstico, tratamiento o valoración de un profesional de salud.';

export function buildAnalysisResult(
  sessionId: string,
  metrics: MetricResult[],
  photoQuality: Record<string, number>
): AnalysisResult {
  const overallScore = Math.round(
    metrics.reduce((sum, m) => sum + m.globalScore, 0) / (metrics.length || 1)
  );

  const confidenceOrder = { low: 0, medium: 1, high: 2 } as const;
  const overallConfidence = metrics.reduce<AnalysisResult['overallConfidence']>((worst, m) => {
    return confidenceOrder[m.confidence] < confidenceOrder[worst] ? m.confidence : worst;
  }, 'high');

  const lowQualityPhotos = Object.entries(photoQuality).filter(([, q]) => q < 0.55);

  return {
    sessionId,
    generatedAt: new Date().toISOString(),
    overallScore,
    overallConfidence,
    photoQuality,
    metrics,
    qualityWarning:
      lowQualityPhotos.length > 0
        ? `Calidad insuficiente en: ${lowQualityPhotos.map(([angle]) => angle).join(', ')}. Se recomienda repetir la captura.`
        : undefined,
    disclaimer: DISCLAIMER
  };
}
