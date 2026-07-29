import { getCv } from '../opencvLoader';
import type { RegionPolygon } from '@/lib/face/faceRegions';

// MySkinAnalyzer — Brillo / sebo.
// Método: máscara de píxeles "brillantes" en HSV (V alto, S bajo, típico de
// reflejo especular sobre piel grasa) y proporción de área brillante dentro
// de cada región. Se reporta con más peso en zona T (frente, nariz, barbilla).

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

const V_THRESHOLD = 200; // 0-255
const S_THRESHOLD = 60;  // 0-255

export function computeShine(rgbMat: any, regions: RegionPolygon[], size: number) {
  const cv = getCv();
  const hsv = new cv.Mat();
  cv.cvtColor(rgbMat, hsv, cv.COLOR_RGB2HSV);

  const lowerBright = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [0, 0, V_THRESHOLD, 0]);
  const upperBright = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [180, S_THRESHOLD, 255, 255]);
  const brightMask = new cv.Mat();
  cv.inRange(hsv, lowerBright, upperBright, brightMask);

  const regionScores: Record<string, number> = {};
  let weightedSum = 0;
  let totalArea = 0;

  for (const region of regions) {
    const regionMask = maskFromPolygon(cv, region, size);
    const combined = new cv.Mat();
    cv.bitwise_and(brightMask, regionMask, combined);

    const regionArea = cv.countNonZero(regionMask);
    const brightArea = cv.countNonZero(combined);
    const brightRatio = regionArea > 0 ? brightArea / regionArea : 0;
    const score = Math.max(0, Math.min(100, 100 - brightRatio * 100));
    regionScores[region.region] = Math.round(score);

    weightedSum += score * regionArea;
    totalArea += regionArea;

    regionMask.delete();
    combined.delete();
  }

  hsv.delete();
  lowerBright.delete();
  upperBright.delete();
  brightMask.delete();

  const globalScore = totalArea > 0 ? Math.round(weightedSum / totalArea) : 0;
  return { globalScore, regionScores };
}
