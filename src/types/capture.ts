// MySkinAnalyzer — tipos relacionados con la captura de fotografías.

export type PhotoAngle = 'frontal' | 'left45' | 'right45';

export interface DeviceInfo {
  userAgent: string;
  cameraFacing: 'user' | 'environment';
  screenResolution: string;
}

export interface CapturedPhoto {
  id: string;
  angle: PhotoAngle;
  width: number;
  height: number;
  capturedAt: string;
  faceCoveragePercent: number;
  lightingScore: number;   // 0-1
  blurScore: number;       // 0-1 (1 = muy nítida)
  imageBitmap: ImageBitmap;
}

export interface CaptureValidationState {
  faceDetected: boolean;
  singlePerson: boolean;
  distanceOk: boolean;
  centeredOk: boolean;
  tiltOk: boolean;
  lightingOk: boolean;
  sharpnessOk: boolean;
  neutralExpressionOk: boolean;
  noOcclusion: boolean;
  noStrongShadows: boolean;
  noMotion: boolean;
  message: string;
  readyToCapture: boolean;
}
