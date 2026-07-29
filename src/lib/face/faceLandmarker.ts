import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision';

// MySkinAnalyzer — wrapper de MediaPipe Face Landmarker.
// Corre en el hilo principal a resolución reducida para no competir con el
// Web Worker de OpenCV, que hace el trabajo pesado sobre el frame final.

let landmarkerInstance: FaceLandmarker | null = null;

export async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (landmarkerInstance) return landmarkerInstance;

  const filesetResolver = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
  );

  landmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      // Modelo servido localmente en producción (ver public/models/README.md);
      // durante desarrollo se puede apuntar temporalmente al CDN de MediaPipe.
      modelAssetPath: '/models/face_landmarker.task',
      delegate: 'GPU'
    },
    runningMode: 'VIDEO',
    numFaces: 2, // detectamos hasta 2 para poder avisar "hay más de una persona"
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false
  });

  return landmarkerInstance;
}

export function detectForVideoFrame(
  landmarker: FaceLandmarker,
  video: HTMLVideoElement,
  timestampMs: number
): FaceLandmarkerResult {
  return landmarker.detectForVideo(video, timestampMs);
}

/** Índices de landmarks clave (esquema de 468 puntos de MediaPipe Face Mesh). */
export const LANDMARK_INDEX = {
  leftEyeOuter: 33,
  rightEyeOuter: 263,
  leftEyeInner: 133,
  rightEyeInner: 362,
  noseTip: 1,
  chin: 152,
  foreheadCenter: 10,
  leftCheek: 234,
  rightCheek: 454,
  mouthLeft: 61,
  mouthRight: 291,
  upperLipTop: 13,
  lowerLipBottom: 14
} as const;
