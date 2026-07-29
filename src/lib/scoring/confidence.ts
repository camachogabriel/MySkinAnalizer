// MySkinAnalyzer — sistema de confianza y calidad (sección 18 del brief).

export interface QualityInputs {
  lightingScore: number;   // 0-1
  sharpnessScore: number;  // 0-1
  faceCoverageScore: number; // 0-1
  symmetryConsistency: number; // 0-1, similitud entre mejilla izq/der (detecta sesgo de luz lateral)
}

const WEIGHTS = {
  lighting: 0.3,
  sharpness: 0.3,
  faceCoverage: 0.2,
  symmetry: 0.2
};

export function computeQualityFactor(inputs: QualityInputs): number {
  const factor =
    WEIGHTS.lighting * inputs.lightingScore +
    WEIGHTS.sharpness * inputs.sharpnessScore +
    WEIGHTS.faceCoverage * inputs.faceCoverageScore +
    WEIGHTS.symmetry * inputs.symmetryConsistency;
  return Math.max(0, Math.min(1, factor));
}

export function confidenceFromQuality(qualityFactor: number): 'low' | 'medium' | 'high' {
  if (qualityFactor >= 0.8) return 'high';
  if (qualityFactor >= 0.55) return 'medium';
  return 'low';
}
