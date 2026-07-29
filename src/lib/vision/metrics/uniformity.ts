import { getCv } from '../opencvLoader';
import type { RegionPolygon } from '@/lib/face/faceRegions';

// MySkinAnalyzer — Uniformidad del tono.
// Método: desviación estándar del canal L (luminosidad) en LAB dentro de cada
// región. Menor dispersión = tono más uniforme = score más alto.

const STD_MAX = 25; // calibrado empíricamente sobre piel normalizada 0-255

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

export function computeUniformity(rgbMat: any, regions: RegionPolygon[], size: number) {
  const cv = getCv();
  const lab = new cv.Mat();
  cv.cvtColor(rgbMat, lab, cv.COLOR_RGB2Lab);
  const channels = new cv.MatVector();
  cv.split(lab, channels);
  const lChannel = channels.get(0);

  const regionScores: Record<string, number> = {};
  let weightedSum = 0;
  let totalArea = 0;

  for (const region of regions) {
    const mask = maskFromPolygon(cv, region, size);
    const meanStdDev = new cv.Mat();
    const meanMat = new cv.Mat();
    const stdMat = new cv.Mat();
    cv.meanStdDev(lChannel, meanMat, stdMat, mask);
    const std = stdMat.doubleAt(0, 0);
    const score = Math.max(0, Math.min(100, 100 - (std / STD_MAX) * 100));
    regionScores[region.region] = Math.round(score);

    const area = cv.countNonZero(mask);
    weightedSum += score * area;
    totalArea += area;

    mask.delete();
    meanStdDev.delete();
    meanMat.delete();
    stdMat.delete();
  }

  lab.delete();
  channels.delete();
  lChannel.delete();

  const globalScore = totalArea > 0 ? Math.round(weightedSum / totalArea) : 0;
  return { globalScore, regionScores };
}
