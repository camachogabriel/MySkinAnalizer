// MySkinAnalyzer — tipos relacionados con métricas y resultados de análisis.

export type FaceRegion =
  | 'forehead'
  | 'leftCheek'
  | 'rightCheek'
  | 'nose'
  | 'chin'
  | 'glabella'
  | 'nasolabial';

export type MetricKey = 'uniformity' | 'redness' | 'shine' | 'texture' | 'pores';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface MetricResult {
  key: MetricKey;
  label: string;
  globalScore: number; // 0-100
  regionScores: Partial<Record<FaceRegion, number>>;
  confidence: ConfidenceLevel;
  qualityFactor: number; // 0-1
  explanation: string;
  limitation: string;
}

export interface AnalysisResult {
  sessionId: string;
  generatedAt: string;
  overallScore: number;
  overallConfidence: ConfidenceLevel;
  photoQuality: Record<string, number>;
  metrics: MetricResult[];
  qualityWarning?: string;
  disclaimer: string;
}
