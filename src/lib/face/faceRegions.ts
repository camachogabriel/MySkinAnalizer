import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { FaceRegion } from '@/types/metrics';

// MySkinAnalyzer — segmentación del rostro en regiones a partir de landmarks
// normalizados (0-1). Los índices provienen del esquema de 468 puntos de
// MediaPipe Face Mesh. Cada región se define como un polígono aproximado;
// para el MVP se prioriza simplicidad y exclusión robusta de ojos/cejas/labios
// por encima de precisión anatómica exhaustiva.

export const REGION_LANDMARK_INDICES: Record<FaceRegion, number[]> = {
  forehead: [10, 67, 109, 338, 297, 332, 103],
  leftCheek: [234, 93, 132, 58, 172, 136, 150],
  rightCheek: [454, 323, 361, 288, 397, 365, 379],
  nose: [168, 6, 197, 195, 5, 4, 45, 275],
  chin: [152, 148, 176, 149, 150, 377, 400, 378],
  glabella: [9, 8, 168, 6],
  nasolabial: [206, 216, 92, 186, 61, 91, 426, 322]
};

/** Regiones a excluir siempre del análisis (ojos, cejas, labios). */
export const EXCLUDED_LANDMARK_INDICES = {
  leftEye: [33, 160, 158, 133, 153, 144],
  rightEye: [362, 385, 387, 263, 373, 380],
  leftEyebrow: [70, 63, 105, 66, 107],
  rightEyebrow: [336, 296, 334, 293, 300],
  lips: [61, 291, 0, 17, 78, 308, 13, 14]
};

export interface RegionPolygon {
  region: FaceRegion;
  points: { x: number; y: number }[]; // en coordenadas de píxel de la imagen normalizada
}

export function buildRegionPolygons(
  landmarks: NormalizedLandmark[],
  imageWidth: number,
  imageHeight: number
): RegionPolygon[] {
  return (Object.keys(REGION_LANDMARK_INDICES) as FaceRegion[]).map((region) => ({
    region,
    points: REGION_LANDMARK_INDICES[region].map((idx) => ({
      x: landmarks[idx].x * imageWidth,
      y: landmarks[idx].y * imageHeight
    }))
  }));
}
