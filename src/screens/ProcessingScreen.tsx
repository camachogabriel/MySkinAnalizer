import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sessionDraft } from '@/lib/storage/sessionDraft';
import { saveSession } from '@/lib/storage/localSessionStore';
import type { AnalysisResult } from '@/types/metrics';
import type { StoredPhoto } from '@/types/session';

// MySkinAnalyzer — pantalla de procesamiento: delega en el Web Worker
// (analysis.worker.ts) todo el trabajo de OpenCV.js para no bloquear la UI.
export default function ProcessingScreen() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [statusText, setStatusText] = useState('Normalizando fotografías...');
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const photos = sessionDraft.getPhotos();
    if (photos.length === 0) {
      navigate('/capture');
      return;
    }

    const worker = new Worker(new URL('../workers/analysis.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = async (event: MessageEvent<{ type: string; result?: AnalysisResult; message?: string }>) => {
      if (event.data.type === 'result' && event.data.result) {
        setStatusText('Guardando resultado...');

        const storedPhotos: StoredPhoto[] = await Promise.all(
          photos.map(async (p) => ({
            id: crypto.randomUUID(),
            angle: p.angle,
            width: p.bitmap.width,
            height: p.bitmap.height,
            capturedAt: new Date().toISOString(),
            faceCoveragePercent: Math.round(p.faceCoverageScore * 100),
            lightingScore: p.lightingScore,
            blurScore: p.sharpnessScore,
            imageBlob: await (await fetch(p.previewUrl)).blob()
          }))
        );

        await saveSession({
          id: sessionId,
          createdAt: new Date().toISOString(),
          device: {
            userAgent: navigator.userAgent,
            cameraFacing: 'user',
            screenResolution: `${window.screen.width}x${window.screen.height}`
          },
          photos: storedPhotos,
          result: event.data.result
        });

        sessionDraft.clear();
        navigate(`/results/${sessionId}`);
      } else if (event.data.type === 'error') {
        setStatusText(`Error: ${event.data.message}`);
      }
    };

    worker.postMessage({
      type: 'analyze',
      sessionId,
      photos: photos.map((p) => ({
        angle: p.angle,
        bitmap: p.bitmap,
        landmarks: p.landmarks,
        lightingScore: p.lightingScore,
        sharpnessScore: p.sharpnessScore,
        faceCoverageScore: p.faceCoverageScore
      }))
    });

    return () => worker.terminate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="msa-screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div className="msa-card">
        <p style={{ fontWeight: 600 }}>{statusText}</p>
        <p style={{ fontSize: 13, color: 'var(--msa-text-secondary)' }}>
          Este proceso ocurre completamente en tu dispositivo.
        </p>
      </div>
    </div>
  );
}
