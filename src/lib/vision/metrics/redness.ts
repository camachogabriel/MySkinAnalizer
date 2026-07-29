import { getCv } from '../opencvLoader';
import type { RegionPolygon } from '@/lib/face/faceRegions';

// MySkinAnalyzer — Rojeces.
// Método: media del canal A de LAB (positivo = rojo) por región, comparada
// contra una línea base (promedio de mejillas de la propia foto si no hay
// histórico previo de la persona). Excluye labios por construcción, ya que
// las regiones definidas en faceRegions.ts no incluyen esos landmarks.

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

const A_RANGE = 40; // rango esperado de variación del canal A sobre piel normalizada

export function computeRedness(rgbMat: any, regions: RegionPolygon[], size: number) {
  const cv = getCv();
  const lab = new cv.Mat();
  cv.cvtColor(rgbMat, lab, cv.COLOR_RGB2Lab);
  const channels = new cv.MatVector();
  cv.split(lab, channels);
  const aChannel = channels.get(1); // canal A

  const regionMeans: Record<string, number> = {};
  const masks: Record<string, any> = {};

  for (const region of regions) {
    const mask = maskFromPolygon(cv, region, size);
    masks[region.region] = mask;
    const mean = cv.mean(aChannel, mask)[0];
    regionMeans[region.region] = mean;
  }

  // Línea base: promedio de mejillas (zonas de referencia menos propensas a
  // rojeces puntuales que nariz o zona nasolabial).
  const baseline = ((regionMeans['leftCheek'] ?? 128) + (regionMeans['rightCheek'] ?? 128)) / 2;

  const regionScores: Record<string, number> = {};
  let weightedSum = 0;
  let totalArea = 0;

  for (const region of regions) {
    const mean = regionMeans[region.region];
    const excess = Math.max(0, mean - baseline);
    const score = Math.max(0, Math.min(100, 100 - (excess / A_RANGE) * 100));
    regionScores[region.region] = Math.round(score);

    const area = cv.countNonZero(masks[region.region]);
    weightedSum += score * area;
    totalArea += area;
    masks[region.region].delete();
  }

  lab.delete();
  channels.delete();
  aChannel.delete();

  const globalScore = totalArea > 0 ? Math.round(weightedSum / totalArea) : 0;
  return { globalScore, regionScores };
}
