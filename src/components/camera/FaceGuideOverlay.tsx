import { useEffect, useRef } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

interface FaceGuideOverlayProps {
  width: number;
  height: number;
  landmarks: NormalizedLandmark[] | null;
  isValidPosition: boolean;
  mirror?: boolean;
}

export default function FaceGuideOverlay({ width, height, landmarks, isValidPosition, mirror = false }: FaceGuideOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const rx = width * 0.28;
    const ry = height * 0.38;

    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - rx, cy - ry * 0.15);
    ctx.lineTo(cx + rx, cy - ry * 0.15);
    ctx.stroke();

    if (landmarks && landmarks.length > 0) {
      ctx.strokeStyle = isValidPosition ? '#16A34A' : '#DC2626';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const faceOvalIndices = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
      faceOvalIndices.forEach((idx, i) => {
        const p = landmarks[idx];
        if (!p) return;
        const x = mirror ? (1 - p.x) * width : p.x * width;
        const y = p.y * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    }
  }, [width, height, landmarks, isValidPosition, mirror]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    />
  );
}
