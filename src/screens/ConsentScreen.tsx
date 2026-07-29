import { useNavigate } from 'react-router-dom';
import PrimaryButton from '@/components/common/PrimaryButton';
import MedicalDisclaimer from '@/components/common/MedicalDisclaimer';

export default function ConsentScreen() {
  const navigate = useNavigate();

  return (
    <div className="msa-screen">
      <h2>Antes de comenzar</h2>
      <div className="msa-card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 15, lineHeight: 1.6 }}>
          Vamos a tomar 3 fotografías de tu rostro (frontal, 45° izquierda y 45° derecha). Todo el
          procesamiento ocurre en este dispositivo: en esta versión ninguna fotografía se envía a
          ningún servidor. Puedes elegir no guardar las fotos al finalizar.
        </p>
        <ul style={{ fontSize: 14, color: 'var(--msa-text-secondary)', paddingLeft: 18 }}>
          <li>El análisis es una estimación orientativa, no un diagnóstico médico.</li>
          <li>Puedes repetir cualquier foto si la calidad no es suficiente.</li>
          <li>Puedes cancelar en cualquier momento.</li>
        </ul>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PrimaryButton onClick={() => navigate('/capture')}>Aceptar y continuar</PrimaryButton>
        <PrimaryButton variant="secondary" onClick={() => navigate('/')}>Cancelar</PrimaryButton>
      </div>

      <MedicalDisclaimer />
    </div>
  );
}
