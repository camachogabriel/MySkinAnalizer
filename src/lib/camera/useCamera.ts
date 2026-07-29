import { useCallback, useEffect, useRef, useState } from 'react';

// MySkinAnalyzer — useCamera
// Abstrae getUserMedia (web) y, cuando corre empaquetado con Capacitor en un
// dispositivo nativo, delega en @capacitor/camera. El resto de la app solo
// consume esta interfaz, sin preocuparse por la plataforma.

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  isReady: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => ImageBitmap | null;
}

function isNativePlatform(): boolean {
  // @capacitor/core expone Capacitor.isNativePlatform(); se evalúa en runtime
  // para no forzar la dependencia en el build web puro.
  const w = window as any;
  return Boolean(w.Capacitor && w.Capacitor.isNativePlatform && w.Capacitor.isNativePlatform());
}

export function useCamera(facingMode: 'user' | 'environment' = 'user'): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      if (isNativePlatform()) {
        // En build nativo, preferimos igualmente getUserMedia dentro del WebView
        // cuando está disponible (más simple para el flujo de guía en vivo);
        // @capacitor/camera se reserva para flujos de captura única sin overlay.
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 1280 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo acceder a la cámara');
      setIsReady(false);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsReady(false);
  }, []);

  const captureFrame = useCallback((): ImageBitmap | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0);
    // createImageBitmap es asíncrono; para mantener la API síncrona y simple
    // en los llamadores, se expone también una variante async abajo.
    return null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  return { videoRef, isReady, error, startCamera, stopCamera, captureFrame };
}

/** Variante asíncrona de captura de frame, usada por CaptureScreen. */
export async function captureFrameAsync(video: HTMLVideoElement): Promise<ImageBitmap> {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0);
  return createImageBitmap(canvas);
}
