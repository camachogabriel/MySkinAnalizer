interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export default function PrimaryButton({ children, onClick, disabled, variant = 'primary' }: PrimaryButtonProps) {
  return (
    <button
      className={variant === 'primary' ? 'msa-button-primary' : 'msa-button-secondary'}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
