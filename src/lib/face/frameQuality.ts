// MySkinAnalyzer — estimación ligera de calidad de frame en el hilo principal
// (sin OpenCV, que se reserva para el Web Worker). Se usa para el loop de
// validación en tiempo real durante la captura, así que debe ser barata.

export interface FrameLuma {
  mean: number;
  leftHalfMean: number;
  rightHalfMean: number;
}

/** Luminancia media general y por mitades, a partir de ImageData ya reducida a baja resolución. */
export function computeFrameLuma(imageData: ImageData): FrameLuma {
  const { data, width, height } = imageData;
  let total = 0;
  let leftTotal = 0;
  let rightTotal = 0;
  let leftCount = 0;
  let rightCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const luma = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      total += luma;
      if (x < width / 2) {
        leftTotal += luma;
        leftCount++;
      } else {
        rightTotal += luma;
        rightCount++;
      }
    }
  }

  const count = width * height;
  return {
    mean: total / count,
    leftHalfMean: leftTotal / (leftCount || 1),
    rightHalfMean: rightTotal / (rightCount || 1)
  };
}

/** Estimación de nitidez mediante varianza de un gradiente simple (proxy barato del Laplaciano). */
export function computeSharpnessEstimate(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx = gray[i + 1] - gray[i - 1];
      const gy = gray[i + width] - gray[i - width];
      const mag = Math.abs(gx) + Math.abs(gy);
      sum += mag;
      sumSq += mag * mag;
      count++;
    }
  }
  const mean = sum / (count || 1);
  const variance = sumSq / (count || 1) - mean * mean;
  return variance;
}

/** Extrae ImageData a baja resolución (ej. 160x120) de un video para evaluar calidad barata. */
export function sampleLowResFrame(video: HTMLVideoElement, targetWidth = 160): ImageData {
  const scale = targetWidth / video.videoWidth;
  const w = targetWidth;
  const h = Math.round(video.videoHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}
