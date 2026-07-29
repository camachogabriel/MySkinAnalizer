import { forwardRef } from 'react';

interface CameraViewProps {
  isReady: boolean;
  mirror?: boolean;
}

const CameraView = forwardRef<HTMLVideoElement, CameraViewProps>(({ isReady, mirror = false }, ref) => {
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '3 / 4', overflow: 'hidden', borderRadius: 16, background: '#000' }}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: isReady ? 1 : 0.3,
          transform: mirror ? 'scaleX(-1)' : 'none'
        }}
      />
    </div>
  );
});

CameraView.displayName = 'CameraView';
export default CameraView;
