import { getCv } from '../opencvLoader';
import type { RegionPolygon } from '@/lib/face/faceRegions';

// MySkinAnalyzer — Textura superficial.
// Método: varianza del filtro Laplaciano sobre el canal de luminancia como
// proxy de rugosidad/alta frecuencia. Un valor alto indica más microrrelieve
// (líneas finas, descamación, textura irregular); se invierte para que un
// score alto signifique piel más lisa/uniforme en textura.

const VARIANCE_MAX = 600; // calibrado empíricamente sobre imágenes 512x512

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

export function computeTexture(rgbMat: any, regions: RegionPolygon[], size: number) {
  const cv = getCv();
  const gray = new cv.Mat();
  cv.cvtColor(rgbMat, gray, cv.COLOR_RGB2GRAY);

  const laplacian = new cv.Mat();
  cv.Laplacian(gray, laplacian, cv.CV_64F, 3);

  const regionScores: Record<string, number> = {};
  let weightedSum = 0;
  let totalArea = 0;

  for (const region of regions) {
    const mask = maskFromPolygon(cv, region, size);
    const meanMat = new cv.Mat();
    const stdMat = new cv.Mat();
    cv.meanStdDev(laplacian, meanMat, stdMat, mask);
    const std = stdMat.doubleAt(0, 0);
    const variance = std * std;

    const score = Math.max(0, Math.min(100, 100 - (variance / VARIANCE_MAX) * 100));
    regionScores[region.region] = Math.round(score);

    const area = cv.countNonZero(mask);
    weightedSum += score * area;
    totalArea += area;

    mask.delete();
    meanMat.delete();
    stdMat.delete();
  }

  gray.delete();
  laplacian.delete();

  const globalScore = totalArea > 0 ? Math.round(weightedSum / totalArea) : 0;
  return { globalScore, regionScores };
}
