import { useNavigate } from 'react-router-dom';
import PrimaryButton from '@/components/common/PrimaryButton';

// MySkinAnalyzer — placeholder de historial. Deshabilitado funcionalmente en
// el MVP (sección 6 del brief); la UI ya existe para no rediseñar en v2,
// cuando se conecte a Supabase y a fichas de cliente.
export default function HistoryScreen() {
  const navigate = useNavigate();
  return (
    <div className="msa-screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <h2>Análisis anteriores</h2>
      <p style={{ color: 'var(--msa-text-secondary)' }}>
        Esta sección estará disponible en una próxima versión, cuando se habilite el historial completo de sesiones.
      </p>
      <PrimaryButton onClick={() => navigate('/')}>Volver al inicio</PrimaryButton>
    </div>
  );
}
