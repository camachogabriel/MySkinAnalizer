import { getCv } from './opencvLoader';

// MySkinAnalyzer — normalización de la fotografía antes de calcular métricas.
// Todo el trabajo ocurre sobre cv.Mat dentro del Web Worker. No se aplica
// ningún filtro cosmético ni de embellecimiento: el objetivo es únicamente
// hacer comparables las fotos entre sí (misma escala, orientación e
// iluminación relativa).

export interface EyePoints {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
}

const OUTPUT_SIZE = 512;

/**
 * Alinea la imagen rotando alrededor del punto medio entre los ojos, de modo
 * que la línea interocular quede horizontal.
 */
export function alignByEyes(src: any, eyes: EyePoints): any {
  const cv = getCv();
  const dx = eyes.rightEye.x - eyes.leftEye.x;
  const dy = eyes.rightEye.y - eyes.leftEye.y;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const center = new cv.Point((eyes.leftEye.x + eyes.rightEye.x) / 2, (eyes.leftEye.y + eyes.rightEye.y) / 2);

  const rotMat = cv.getRotationMatrix2D(center, angleDeg, 1.0);
  const dst = new cv.Mat();
  cv.warpAffine(src, dst, rotMat, new cv.Size(src.cols, src.rows));
  rotMat.delete();
  return dst;
}

/** Recorta al óvalo facial con margen fijo y redimensiona a OUTPUT_SIZE x OUTPUT_SIZE. */
export function cropAndResizeToFace(
  src: any,
  faceBoundingBox: { x: number; y: number; width: number; height: number },
  marginRatio = 0.25
): any {
  const cv = getCv();
  const marginX = faceBoundingBox.width * marginRatio;
  const marginY = faceBoundingBox.height * marginRatio;

  const x = Math.max(0, Math.round(faceBoundingBox.x - marginX));
  const y = Math.max(0, Math.round(faceBoundingBox.y - marginY));
  const w = Math.min(src.cols - x, Math.round(faceBoundingBox.width + marginX * 2));
  const h = Math.min(src.rows - y, Math.round(faceBoundingBox.height + marginY * 2));

  const rect = new cv.Rect(x, y, w, h);
  const cropped = src.roi(rect);
  const resized = new cv.Mat();
  cv.resize(cropped, resized, new cv.Size(OUTPUT_SIZE, OUTPUT_SIZE), 0, 0, cv.INTER_AREA);
  cropped.delete();
  return resized;
}

/**
 * Normaliza el brillo con CLAHE sobre el canal L de LAB, preservando color
 * (a diferencia de ecualizar directamente en RGB, que distorsiona el tono).
 */
export function normalizeBrightnessLAB(src: any): any {
  const cv = getCv();
  const lab = new cv.Mat();
  cv.cvtColor(src, lab, cv.COLOR_RGBA2RGB);
  cv.cvtColor(lab, lab, cv.COLOR_RGB2Lab);

  const channels = new cv.MatVector();
  cv.split(lab, channels);
  const lChannel = channels.get(0);

  const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
  const lEq = new cv.Mat();
  clahe.apply(lChannel, lEq);
  clahe.delete();

  channels.set(0, lEq);
  const merged = new cv.Mat();
  cv.merge(channels, merged);

  const result = new cv.Mat();
  cv.cvtColor(merged, result, cv.COLOR_Lab2RGB);

  lab.delete();
  lChannel.delete();
  lEq.delete();
  merged.delete();
  channels.delete();

  return result;
}

/** Balance de blancos simplificado tipo "gray-world". */
export function normalizeWhiteBalance(src: any): any {
  const cv = getCv();
  const channels = new cv.MatVector();
  cv.split(src, channels);

  const means: number[] = [];
  for (let i = 0; i < 3; i++) {
    means.push(cv.mean(channels.get(i))[0]);
  }
  const grayMean = (means[0] + means[1] + means[2]) / 3;

  for (let i = 0; i < 3; i++) {
    const ch = channels.get(i);
    const scale = grayMean / (means[i] || 1);
    ch.convertTo(ch, -1, scale, 0);
  }

  const result = new cv.Mat();
  cv.merge(channels, result);
  channels.delete();
  return result;
}

export interface NormalizedFace {
  mat: any;      // cv.Mat resultante, 512x512, RGB
  outputSize: number;
}

export function runNormalizationPipeline(
  srcRgba: any,
  eyes: EyePoints,
  faceBoundingBox: { x: number; y: number; width: number; height: number }
): NormalizedFace {
  const aligned = alignByEyes(srcRgba, eyes);
  const cropped = cropAndResizeToFace(aligned, faceBoundingBox);
  const brightnessNorm = normalizeBrightnessLAB(cropped);
  const colorNorm = normalizeWhiteBalance(brightnessNorm);

  aligned.delete();
  cropped.delete();
  brightnessNorm.delete();

  return { mat: colorNorm, outputSize: OUTPUT_SIZE };
}
