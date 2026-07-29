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
  const { videoRef, isReady, error, startCamera, stopCamera } = useCamera('user');
  const [stepIndex, setStepIndex] = useState(0);
  const [message, setMessage] = useState('Buscando rostro...');
  const [ready, setReady] = useState(false);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoSize, setVideoSize] = useState({ width: 360, height: 480 });

  const holdStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const capturingRef = useRef(false);
  // Guarda el último frame de landmarks sin pasar por React state, para que
  // captureCurrentPhoto no dependa de "landmarks" y el efecto de detección no
  // se reinicie en cada frame (antes se recreaba ~60 veces por segundo).
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const stepRef = useRef(STEPS[0]);
  stepRef.current = STEPS[stepIndex];

  const currentStep = STEPS[stepIndex];

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      faceCoverageScore: 0.8, // aproximación MVP; se refina con el bounding box real
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
              return; // detiene el loop hasta que se decida repetir/continuar
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
    // Limpiamos el estado visual para no mostrar el óvalo/mensaje del paso
    // anterior mientras arranca la detección del nuevo paso.
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

  return (
    <div className="msa-screen">
      <ProgressSteps currentStep={stepIndex + 1} totalSteps={STEPS.length} stepLabel={currentStep.label} />

      {error && <p style={{ color: 'var(--msa-error)' }}>{error}</p>}

      {/* El bloque de cámara se queda montado siempre (solo se oculta con
          CSS durante la vista previa) para que el <video> nunca pierda el
          stream de la cámara al cambiar de paso. */}
      <div style={{ position: 'relative', display: previewUrl ? 'none' : 'block' }}>
        <CameraView ref={videoRef} isReady={isReady} />
        <FaceGuideOverlay width={videoSize.width} height={videoSize.height} landmarks={landmarks} isValidPosition={ready} />
        <CaptureStatusBanner message={message} ready={ready} />
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
