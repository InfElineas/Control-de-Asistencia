import { LogIn, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttendanceButtonProps {
  type: 'IN' | 'OUT';
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}

export function AttendanceButton({ type, disabled, loading, onClick }: AttendanceButtonProps) {
  const isIn = type === 'IN';

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'attendance-btn flex items-center justify-center gap-3',
        disabled
          ? 'attendance-btn-disabled'
          : isIn
          ? 'attendance-btn-in'
          : 'attendance-btn-out'
      )}
    >
      {loading ? (
        <span className="animate-pulse">Registrando...</span>
      ) : (
        <>
          {isIn ? <LogIn className="h-8 w-8" /> : <LogOut className="h-8 w-8" />}
          <span>{isIn ? 'ENTRADA' : 'SALIDA'}</span>
        </>
      )}
    </button>
  );
}
