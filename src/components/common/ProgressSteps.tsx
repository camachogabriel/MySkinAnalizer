interface ProgressStepsProps {
  currentStep: number; // 1-based
  totalSteps: number;
  stepLabel: string;
}

export default function ProgressSteps({ currentStep, totalSteps, stepLabel }: ProgressStepsProps) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 12 }}>
      <div style={{ fontSize: 14, color: 'var(--msa-text-secondary)', fontWeight: 600 }}>
        Paso {currentStep} de {totalSteps}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{stepLabel}</div>
    </div>
  );
}
