import { useNavigate } from 'react-router-dom';
import PrimaryButton from '@/components/common/PrimaryButton';
import MedicalDisclaimer from '@/components/common/MedicalDisclaimer';

export default function HomeScreen() {
  const navigate = useNavigate();

  return (
    <div className="msa-screen">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 16 }}>
        <h1 style={{ color: 'var(--msa-primary)', fontSize: 32, margin: 0 }}>MySkinAnalyzer</h1>
        <p style={{ color: 'var(--msa-text-secondary)', fontSize: 16, maxWidth: 320 }}>
          Analiza y da seguimiento a la apariencia de tu piel a partir de fotografías estandarizadas de tu rostro.
        </p>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          <PrimaryButton onClick={() => navigate('/consent')}>Iniciar análisis</PrimaryButton>
          <PrimaryButton variant="secondary" disabled onClick={() => navigate('/history')}>
            Análisis anteriores (próximamente)
          </PrimaryButton>
        </div>
      </div>

      <MedicalDisclaimer />
    </div>
  );
}
