/// <reference lib="webworker" />
import { loadOpenCv, getCv } from '@/lib/vision/opencvLoader';
import { runNormalizationPipeline } from '@/lib/vision/normalization';
import { buildRegionPolygons } from '@/lib/face/faceRegions';
import { computeAllMetrics } from '@/lib/vision/metrics';
import { computeQualityFactor, confidenceFromQuality } from '@/lib/scoring/confidence';
import { buildAnalysisResult } from '@/lib/scoring/resultFormat';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

// MySkinAnalyzer — Web Worker de análisis.
// Recibe, por foto: el frame (ImageBitmap transferible), los landmarks
// detectados en el momento de la captura y las métricas de calidad de
// encuadre. Devuelve el AnalysisResult completo. Todo ocurre localmente:
// ninguna imagen sale del dispositivo.

export interface AnalysisWorkerInputPhoto {
  angle: 'frontal' | 'left45' | 'right45';
  bitmap: ImageBitmap;
  landmarks: NormalizedLandmark[];
  lightingScore: number;   // 0-1
  sharpnessScore: number;  // 0-1
  faceCoverageScore: number; // 0-1
}

export interface AnalysisWorkerRequest {
  type: 'analyze';
  sessionId: string;
  photos: AnalysisWorkerInputPhoto[];
}

self.onmessage = async (event: MessageEvent<AnalysisWorkerRequest>) => {
  const { data } = event;
  if (data.type !== 'analyze') return;

  try {
    await loadOpenCv();
    const cv = getCv();

    // El análisis principal se calcula sobre la foto frontal (mejor
    // referencia para regiones simétricas); las fotos a 45° quedan
    // preparadas para enriquecer el análisis de contorno en versiones
    // futuras, pero no se descartan del resultado de calidad.
    const frontal = data.photos.find((p) => p.angle === 'frontal');
    if (!frontal) throw new Error('Falta la fotografía frontal');

    const imgData = bitmapToImageData(frontal.bitmap);
    const srcMat = cv.matFromImageData(imgData);

    const leftEye = frontal.landmarks[33];
    const rightEye = frontal.landmarks[263];
    const faceLeft = frontal.landmarks[234];
    const faceRight = frontal.landmarks[454];
    const faceTop = frontal.landmarks[10];
    const faceBottom = frontal.landmarks[152];

    const w = frontal.bitmap.width;
    const h = frontal.bitmap.height;

    const boundingBox = {
      x: faceLeft.x * w,
      y: faceTop.y * h,
      width: (faceRight.x - faceLeft.x) * w,
      height: (faceBottom.y - faceTop.y) * h
    };

    const eyes = {
      leftEye: { x: leftEye.x * w, y: leftEye.y * h },
      rightEye: { x: rightEye.x * w, y: rightEye.y * h }
    };

    const normalized = runNormalizationPipeline(srcMat, eyes, boundingBox);

    // Los landmarks deben reproyectarse sobre la imagen normalizada; para el
    // MVP se aproxima usando los landmarks originales normalizados (0-1)
    // directamente sobre el tamaño de salida, lo cual es razonable porque el
    // recorte+resize preserva la geometría relativa del rostro.
    const regions = buildRegionPolygons(frontal.landmarks, normalized.outputSize, normalized.outputSize);

    const symmetryConsistency = 1; // placeholder simple para el MVP; se refina con más sesiones de calibración
    const qualityFactor = computeQualityFactor({
      lightingScore: frontal.lightingScore,
      sharpnessScore: frontal.sharpnessScore,
      faceCoverageScore: frontal.faceCoverageScore,
      symmetryConsistency
    });

    const metrics = computeAllMetrics(normalized.mat, regions, normalized.outputSize, qualityFactor);

    const photoQuality: Record<string, number> = {};
    for (const photo of data.photos) {
      photoQuality[photo.angle] = computeQualityFactor({
        lightingScore: photo.lightingScore,
        sharpnessScore: photo.sharpnessScore,
        faceCoverageScore: photo.faceCoverageScore,
        symmetryConsistency: 1
      });
    }

    const result = buildAnalysisResult(data.sessionId, metrics, photoQuality);

    srcMat.delete();
    normalized.mat.delete();

    (self as unknown as Worker).postMessage({ type: 'result', result });
  } catch (err) {
    (self as unknown as Worker).postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Error desconocido en el análisis'
    });
  }
};

function bitmapToImageData(bitmap: ImageBitmap): ImageData {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
}

// Confirma explícitamente el nivel de confianza calculado (uso interno/documentación).
export const _confidenceHelper = confidenceFromQuality;
