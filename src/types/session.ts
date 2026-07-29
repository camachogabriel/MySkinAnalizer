// MySkinAnalyzer — tipos de sesión (compatibles con el futuro esquema de Supabase).
import type { DeviceInfo, PhotoAngle } from './capture';
import type { AnalysisResult } from './metrics';

export interface StoredPhoto {
  id: string;
  angle: PhotoAngle;
  width: number;
  height: number;
  capturedAt: string;
  faceCoveragePercent: number;
  lightingScore: number;
  blurScore: number;
  imageBlob: Blob;
}

export interface Session {
  id: string;
  createdAt: string;
  device: DeviceInfo;
  photos: StoredPhoto[];
  result?: AnalysisResult;
}
