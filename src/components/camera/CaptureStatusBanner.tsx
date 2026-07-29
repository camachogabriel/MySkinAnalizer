interface CaptureStatusBannerProps {
  message: string;
  ready: boolean;
}

export default function CaptureStatusBanner({ message, ready }: CaptureStatusBannerProps) {
  return (
    <div
      className="msa-status-banner"
      style={{ background: ready ? 'rgba(22,163,74,0.9)' : 'rgba(15,23,42,0.85)' }}
    >
      {message}
    </div>
  );
}
