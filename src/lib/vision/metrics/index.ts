import type { RegionPolygon } from '@/lib/face/faceRegions';
import type { FaceRegion, MetricResult } from '@/types/metrics';
import { computeUniformity } from './uniformity';
import { computeRedness } from './redness';
import { computeShine } from './shine';
import { computeTexture } from './texture';
import { computePores } from './pores';

// MySkinAnalyzer — orquestador de métricas del MVP. Corre íntegramente dentro
// del Web Worker sobre la imagen ya normalizada (ver lib/vision/normalization.ts).

const METRIC_LABELS: Record<string, string> = {
  uniformity: 'Uniformidad del tono',
  redness: 'Rojeces',
  shine: 'Brillo / sebo',
  texture: 'Textura superficial',
  pores: 'Poros aparentes'
};

const METRIC_EXPLANATIONS: Record<string, string> = {
  uniformity: 'Mide la dispersión del tono de piel dentro de cada zona a partir de la luminosidad en el espacio de color LAB.',
  redness: 'Compara el canal de rojo-verde (LAB) de cada zona contra el promedio de las mejillas de la misma foto.',
  shine: 'Detecta reflejos especulares (alta luminosidad, baja saturación) típicos de piel con más sebo.',
  texture: 'Estima la rugosidad superficial aparente a partir de variaciones de alta frecuencia en la imagen.',
  pores: 'Cuenta micro-regiones oscuras de tamaño pequeño y las relaciona con el área de cada zona facial.'
};

const METRIC_LIMITATIONS: Record<string, string> = {
  uniformity: 'Sensible a diferencias de iluminación entre zonas del rostro.',
  redness: 'Puede confundirse con enrojecimiento temporal (ejercicio, frío, irritación reciente).',
  shine: 'Depende fuertemente de la iluminación directa al momento de la foto.',
  texture: 'No distingue entre textura de piel y ruido/compresión de la cámara del dispositivo.',
  pores: 'La resolución de la cámara y la distancia afectan directamente el conteo; no es una medición dermatológica de poro individual.'
};

export interface MetricComputation {
  globalScore: number;
  regionScores: Record<string, number>;
}

export function computeAllMetrics(
  normalizedRgbMat: any,
  regions: RegionPolygon[],
  outputSize: number,
  qualityFactor: number
): MetricResult[] {
  const raw: Record<string, MetricComputation> = {
    uniformity: computeUniformity(normalizedRgbMat, regions, outputSize),
    redness: computeRedness(normalizedRgbMat, regions, outputSize),
    shine: computeShine(normalizedRgbMat, regions, outputSize),
    texture: computeTexture(normalizedRgbMat, regions, outputSize),
    pores: computePores(normalizedRgbMat, regions, outputSize)
  };

  const confidence = qualityFactor >= 0.8 ? 'high' : qualityFactor >= 0.55 ? 'medium' : 'low';

  return (Object.keys(raw) as (keyof typeof raw)[]).map((key) => ({
    key: key as MetricResult['key'],
    label: METRIC_LABELS[key],
    globalScore: raw[key].globalScore,
    regionScores: raw[key].regionScores as Partial<Record<FaceRegion, number>>,
    confidence,
    qualityFactor,
    explanation: METRIC_EXPLANATIONS[key],
    limitation: METRIC_LIMITATIONS[key]
  }));
}
