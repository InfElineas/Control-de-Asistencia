import { Button } from '@/components/ui/button';

export function PrimaryActionButton({
  label,
  disabled,
  loading,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className="h-14 w-full rounded text-base font-bold tracking-wide shadow-sm"
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? 'Procesando...' : label}
    </Button>
  );
}
