import { getCv } from '../opencvLoader';
import type { RegionPolygon } from '@/lib/face/faceRegions';

// MySkinAnalyzer — Poros aparentes.
// Método: top-hat morfológico sobre el canal de luminancia para resaltar
// micro-regiones oscuras de pequeño tamaño, umbral adaptativo y conteo de
// blobs filtrados por área. El score es inversamente proporcional a la
// densidad de blobs relativa al área de la región (no a un conteo absoluto,
// para que sea comparable entre fotos con distinto tamaño de rostro).

const MIN_BLOB_AREA = 2;
const MAX_BLOB_AREA = 40; // px^2 a 512x512 — descarta manchas grandes (no son poros)
const DENSITY_MAX = 0.02; // proporción de área ocupada por blobs, calibrado empíricamente

function maskFromPolygon(cv: any, region: RegionPolygon, size: number): any {
  const mask = cv.Mat.zeros(size, size, cv.CV_8UC1);
  const pts = cv.matFromArray(
    region.points.length,
    1,
    cv.CV_32SC2,
    region.points.flatMap((p) => [Math.round(p.x), Math.round(p.y)])
  );
  const contours = new cv.MatVector();
  contours.push_back(pts);
  cv.fillPoly(mask, contours, new cv.Scalar(255));
  pts.delete();
  contours.delete();
  return mask;
}

export function computePores(rgbMat: any, regions: RegionPolygon[], size: number) {
  const cv = getCv();
  const gray = new cv.Mat();
  cv.cvtColor(rgbMat, gray, cv.COLOR_RGB2GRAY);

  // Top-hat morfológico: resalta puntos oscuros pequeños sobre fondo relativamente uniforme.
  const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
  const inverted = new cv.Mat();
  cv.bitwise_not(gray, inverted);
  const blackhat = new cv.Mat();
  cv.morphologyEx(inverted, blackhat, cv.MORPH_TOPHAT, kernel);

  const thresholded = new cv.Mat();
  cv.adaptiveThreshold(blackhat, thresholded, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 15, -2);

  const regionScores: Record<string, number> = {};
  let weightedSum = 0;
  let totalArea = 0;

  for (const region of regions) {
    const mask = maskFromPolygon(cv, region, size);
    const regionBlobs = new cv.Mat();
    cv.bitwise_and(thresholded, mask, regionBlobs);

    const labels = new cv.Mat();
    const stats = new cv.Mat();
    const centroids = new cv.Mat();
    const numLabels = cv.connectedComponentsWithStats(regionBlobs, labels, stats, centroids);

    let poreArea = 0;
    for (let i = 1; i < numLabels; i++) {
      const area = stats.intAt(i, cv.CC_STAT_AREA);
      if (area >= MIN_BLOB_AREA && area <= MAX_BLOB_AREA) {
        poreArea += area;
      }
    }

    const regionArea = cv.countNonZero(mask);
    const density = regionArea > 0 ? poreArea / regionArea : 0;
    const score = Math.max(0, Math.min(100, 100 - (density / DENSITY_MAX) * 100));
    regionScores[region.region] = Math.round(score);

    weightedSum += score * regionArea;
    totalArea += regionArea;

    mask.delete();
    regionBlobs.delete();
    labels.delete();
    stats.delete();
    centroids.delete();
  }

  gray.delete();
  kernel.delete();
  inverted.delete();
  blackhat.delete();
  thresholded.delete();

  const globalScore = totalArea > 0 ? Math.round(weightedSum / totalArea) : 0;
  return { globalScore, regionScores };
}
