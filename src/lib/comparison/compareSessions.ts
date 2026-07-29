import type { AnalysisResult, MetricKey } from '@/types/metrics';

// MySkinAnalyzer — comparación básica entre sesiones (sección 11 del brief).
// Solo se reporta un cambio como "relevante" si supera el umbral mínimo Y
// ambas sesiones tienen confianza suficiente; de lo contrario se marca como
// "sin cambio significativo detectable" para evitar falsas conclusiones por
// diferencias de iluminación, enfoque o posición.

const MIN_RELEVANT_CHANGE_PERCENT = 8;
const MIN_CONFIDENCE_FOR_COMPARISON: Array<AnalysisResult['overallConfidence']> = ['medium', 'high'];

export interface MetricComparison {
  key: MetricKey;
  previousScore: number;
  currentScore: number;
  deltaPercent: number;
  isRelevant: boolean;
  note: string;
}

export function compareSessions(previous: AnalysisResult, current: AnalysisResult): MetricComparison[] {
  const canCompareReliably =
    MIN_CONFIDENCE_FOR_COMPARISON.includes(previous.overallConfidence) &&
    MIN_CONFIDENCE_FOR_COMPARISON.includes(current.overallConfidence);

  return current.metrics.map((currentMetric) => {
    const previousMetric = previous.metrics.find((m) => m.key === currentMetric.key);
    if (!previousMetric || previousMetric.globalScore === 0) {
      return {
        key: currentMetric.key,
        previousScore: previousMetric?.globalScore ?? 0,
        currentScore: currentMetric.globalScore,
        deltaPercent: 0,
        isRelevant: false,
        note: 'Sin datos previos suficientes para comparar.'
      };
    }

    const deltaPercent =
      ((currentMetric.globalScore - previousMetric.globalScore) / previousMetric.globalScore) * 100;

    const isRelevant = canCompareReliably && Math.abs(deltaPercent) >= MIN_RELEVANT_CHANGE_PERCENT;

    return {
      key: currentMetric.key,
      previousScore: previousMetric.globalScore,
      currentScore: currentMetric.globalScore,
      deltaPercent: Math.round(deltaPercent * 10) / 10,
      isRelevant,
      note: !canCompareReliably
        ? 'Confianza insuficiente en una de las sesiones; no se reporta como cambio confirmado.'
        : isRelevant
          ? deltaPercent > 0
            ? 'Mejora relevante respecto a la sesión anterior.'
            : 'Cambio relevante que conviene observar.'
          : 'Sin cambio significativo detectable.'
    };
  });
}
