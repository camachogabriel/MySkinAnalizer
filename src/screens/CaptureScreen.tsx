import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import CameraView from '@/components/camera/CameraView';
import FaceGuideOverlay from '@/components/camera/FaceGuideOverlay';
import CaptureStatusBanner from '@/components/camera/CaptureStatusBanner';
import ProgressSteps from '@/components/common/ProgressSteps';
import PrimaryButton from '@/components/common/PrimaryButton';
import { useCamera, captureFrameAsync } from '@/lib/camera/useCamera';
import { getFaceLandmarker, detectForVideoFrame } from '@/lib/face/faceLandmarker';
import { evaluateFacePosition } from '@/lib/face/captureValidations';
import { computeFrameLuma, computeSharpnessEstimate, sampleLowResFrame } from '@/lib/face/frameQuality';
import { sessionDraft } from '@/lib/storage/sessionDraft';
import type { PhotoAngle } from '@/types/capture';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

const STEPS: { angle: PhotoAngle; label: string }[] = [
  { angle: 'frontal', label: 'Fotografía frontal' },
  { angle: 'left45', label: 'Gira ligeramente hacia la izquierda' },
  { angle: 'right45', label: 'Gira ligeramente hacia la derecha' }
];

const AUTO_CAPTURE_HOLD_MS = 1200;

export default function CaptureScreen() {
  const navigate = useNavigate();
  // Por defecto usamos la cámara trasera/principal (mejor calidad de imagen
  // que la selfie en la gran mayoría de teléfonos). El botón de la esquina
  // permite cambiar a la selfie para fotos personales si se prefiere.
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const { videoRef, isReady, error, startCamera, stopCamera } = useCamera(facingMode);
  const [stepIndex, setStepIndex] = useState(0);
  const [message, setMessage] = useState('Buscando rostro...');
  const [ready, setReady] = useState(false);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoSize, setVideoSize] = useState({ width: 360, height: 480 });

  const holdStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const capturingRef = useRef(false);
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const stepRef = useRef(STEPS[0]);
  stepRef.current = STEPS[stepIndex];

  const currentStep = STEPS[stepIndex];
  const mirror = facingMode === 'user';

  // Se reinicia el stream cada vez que cambia facingMode (incluida la
  // primera vez, al montar). stopCamera limpia el stream anterior antes de
  // pedir el nuevo, así no quedan dos cámaras activas a la vez.
  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const captureCurrentPhoto = useCallback(async () => {
    if (!videoRef.current || capturingRef.current) return;
    capturingRef.current = true;

    const bitmap = await captureFrameAsync(videoRef.current);
    const lowRes = sampleLowResFrame(videoRef.current);
    const luma = computeFrameLuma(lowRes);
    const sharpness = computeSharpnessEstimate(lowRes);

    sessionDraft.addPhoto({
      angle: stepRef.current.angle,
      bitmap,
      landmarks: landmarksRef.current ?? [],
      lightingScore: Math.max(0, Math.min(1, (luma.mean - 70) / (210 - 70))),
      sharpnessScore: Math.max(0, Math.min(1, sharpness / 400)),
      faceCoverageScore: 0.8,
      previewUrl: bitmap ? canvasFromBitmapUrl(bitmap) : ''
    });

    setPreviewUrl(canvasFromBitmapUrl(bitmap));
    capturingRef.current = false;
  }, [videoRef]);

  useEffect(() => {
    if (!isReady || previewUrl) return;
    let cancelled = false;

    (async () => {
      const landmarker = await getFaceLandmarker();

      const loop = () => {
        if (cancelled || !videoRef.current) return;
        const video = videoRef.current;
        if (video.videoWidth > 0) {
          setVideoSize({ width: video.clientWidth, height: video.clientHeight });

          const result = detectForVideoFrame(landmarker, video, performance.now());
          const lowRes = sampleLowResFrame(video);
          const luma = computeFrameLuma(lowRes);
          const sharpness = computeSharpnessEstimate(lowRes);

          const state = evaluateFacePosition(result.faceLandmarks ?? [], luma, sharpness);
          setMessage(state.message);
          setReady(state.readyToCapture);
          landmarksRef.current = result.faceLandmarks?.[0] ?? null;
          setLandmarks(landmarksRef.current);

          if (state.readyToCapture) {
            if (holdStartRef.current === null) holdStartRef.current = performance.now();
            else if (performance.now() - holdStartRef.current >= AUTO_CAPTURE_HOLD_MS) {
              holdStartRef.current = null;
              captureCurrentPhoto();
              return;
            }
          } else {
            holdStartRef.current = null;
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isReady, previewUrl, captureCurrentPhoto, videoRef]);

  const handleRetake = () => {
    setPreviewUrl(null);
    holdStartRef.current = null;
  };

  const handleContinue = () => {
    setPreviewUrl(null);
    holdStartRef.current = null;
    setLandmarks(null);
    landmarksRef.current = null;
    setReady(false);
    setMessage('Buscando rostro...');

    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      const sessionId = uuidv4();
      navigate(`/processing/${sessionId}`);
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="msa-screen">
      <ProgressSteps currentStep={stepIndex + 1} totalSteps={STEPS.length} stepLabel={currentStep.label} />

      {error && <p style={{ color: 'var(--msa-error)' }}>{error}</p>}

      <div style={{ position: 'relative', display: previewUrl ? 'none' : 'block' }}>
        <CameraView ref={videoRef} isReady={isReady} mirror={mirror} />
        <FaceGuideOverlay width={videoSize.width} height={videoSize.height} landmarks={landmarks} isValidPosition={ready} mirror={mirror} />
        <CaptureStatusBanner message={message} ready={ready} />

        <button
          onClick={toggleCamera}
          aria-label={facingMode === 'environment' ? 'Cambiar a cámara selfie' : 'Cambiar a cámara trasera'}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(15,23,42,0.65)',
            color: 'white',
            fontSize: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </button>

        <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(15,23,42,0.65)', color: 'white', fontSize: 12, padding: '4px 10px', borderRadius: 999 }}>
          {facingMode === 'environment' ? 'Cámara trasera' : 'Cámara selfie'}
        </div>
      </div>

      {previewUrl && (
        <div>
          <img src={previewUrl} alt="Vista previa" style={{ width: '100%', borderRadius: 16 }} />
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <PrimaryButton variant="secondary" onClick={handleRetake}>Repetir</PrimaryButton>
            <PrimaryButton onClick={handleContinue}>Continuar</PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

function canvasFromBitmapUrl(bitmap: ImageBitmap): string {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.9);
}
