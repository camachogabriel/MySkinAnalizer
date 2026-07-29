import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { LANDMARK_INDEX } from './faceLandmarker';
import type { CaptureValidationState } from '@/types/capture';

// MySkinAnalyzer — validaciones automáticas de captura (sección 11 del brief).
// Cada función es independiente y barata de calcular, para poder correr en
// cada frame sin afectar el frame rate del overlay de guía.

const THRESHOLDS = {
  distanceMinRatio: 0.42, // ancho de rostro / ancho de frame
  distanceMaxRatio: 0.68,
  centerOffsetMax: 0.09,  // proporción del ancho del frame
  tiltMaxDegrees: 10,
  lightingMin: 70,        // luminancia media 0-255
  lightingMax: 210,
  shadowDiffMax: 35,      // diferencia de luminancia entre mitades del rostro
  sharpnessMin: 25        // varianza del Laplaciano (calculado en el worker de calidad)
};

function dist(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function evaluateFacePosition(
  landmarksList: NormalizedLandmark[][],
  frameLuma: { mean: number; leftHalfMean: number; rightHalfMean: number },
  sharpness: number
): CaptureValidationState {
  const base: CaptureValidationState = {
    faceDetected: false,
    singlePerson: true,
    distanceOk: false,
    centeredOk: false,
    tiltOk: false,
    lightingOk: false,
    sharpnessOk: false,
    neutralExpressionOk: true,
    noOcclusion: true,
    noStrongShadows: true,
    noMotion: true,
    message: 'Buscando rostro...',
    readyToCapture: false
  };

  if (landmarksList.length === 0) {
    base.message = 'No se detecta ningún rostro';
    return base;
  }

  if (landmarksList.length > 1) {
    base.singlePerson = false;
    base.message = 'Solo debe haber una persona en el encuadre';
    return base;
  }

  base.faceDetected = true;
  const landmarks = landmarksList[0];

  const leftEye = landmarks[LANDMARK_INDEX.leftEyeOuter];
  const rightEye = landmarks[LANDMARK_INDEX.rightEyeOuter];
  const leftCheek = landmarks[LANDMARK_INDEX.leftCheek];
  const rightCheek = landmarks[LANDMARK_INDEX.rightCheek];

  // Distancia: ancho de rostro (mejilla a mejilla) como proporción del frame (normalizado 0-1).
  const faceWidth = dist(leftCheek, rightCheek);
  if (faceWidth < THRESHOLDS.distanceMinRatio) {
    base.message = 'Acércate un poco';
    return base;
  }
  if (faceWidth > THRESHOLDS.distanceMaxRatio) {
    base.message = 'Aléjate un poco';
    return base;
  }
  base.distanceOk = true;

  // Centrado: centroide de landmarks vs. centro del frame (0.5, 0.5).
  const centroidX = (leftCheek.x + rightCheek.x) / 2;
  const centroidY = (leftEye.y + landmarks[LANDMARK_INDEX.chin].y) / 2;
  const offset = Math.hypot(centroidX - 0.5, centroidY - 0.5);
  if (offset > THRESHOLDS.centerOffsetMax) {
    base.message = 'Centra tu rostro';
    return base;
  }
  base.centeredOk = true;

  // Inclinación: ángulo de la línea interocular respecto a la horizontal.
  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  const tiltDegrees = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
  if (tiltDegrees > THRESHOLDS.tiltMaxDegrees) {
    base.message = 'Nivela tu cabeza';
    return base;
  }
  base.tiltOk = true;

  // Iluminación general.
  if (frameLuma.mean < THRESHOLDS.lightingMin) {
    base.message = 'Mejora la iluminación';
    return base;
  }
  if (frameLuma.mean > THRESHOLDS.lightingMax) {
    base.message = 'Reduce la luz directa sobre el rostro';
    return base;
  }
  base.lightingOk = true;

  // Sombras fuertes: diferencia de luminancia entre mitad izquierda y derecha.
  const shadowDiff = Math.abs(frameLuma.leftHalfMean - frameLuma.rightHalfMean);
  if (shadowDiff > THRESHOLDS.shadowDiffMax) {
    base.noStrongShadows = false;
    base.message = 'Ilumina el rostro de forma pareja';
    return base;
  }

  // Enfoque.
  if (sharpness < THRESHOLDS.sharpnessMin) {
    base.message = 'Mantén el teléfono firme, imagen desenfocada';
    return base;
  }
  base.sharpnessOk = true;

  base.message = 'Posición correcta';
  base.readyToCapture = true;
  return base;
}
