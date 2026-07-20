import { Link, useLocation } from 'react-router-dom';
import { Clock3, CalendarDays, TriangleAlert, User, LogOut, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmployeeShellProps {
  children: React.ReactNode;
}

const tabs = [
  { href: '/attendance', label: 'Marcar', icon: Clock3 },
  { href: '/history', label: 'Mi semana', icon: CalendarDays },
  { href: '/incidents', label: 'Incidencias', icon: TriangleAlert },
  { href: '/profile', label: 'Perfil', icon: User },
];

export function EmployeeShell({ children }: EmployeeShellProps) {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const todayLabel = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-20 px-4 pt-4">
        <div
          className="mx-auto max-w-md overflow-hidden rounded-xl px-4 py-4 text-foreground aurora-surface"
          style={{ boxShadow: 'rgba(0,0,0,0.5) 0px 4px 30px 0px' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Control de Asistencia ELINEAS</p>
              <h1
                className="text-sm font-semibold text-foreground mt-0.5"
                style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}
              >
                Hola, {profile?.full_name?.split(' ')[0] || 'Empleado'}
              </h1>
              <p className="text-xs text-[#85a6e9]">Empleado</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="h-8 border-muted-foreground/30 bg-white/5 text-foreground hover:bg-white/10 hover:text-foreground"
            >
              <LogOut className="mr-1 h-3.5 w-3.5" />
              Salir
            </Button>
          </div>
          <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground capitalize">
            <Calendar className="h-3.5 w-3.5" />
            {todayLabel}
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 py-4">{children}</main>

      <nav className="fixed bottom-3 left-0 right-0 z-30 px-4">
        <div
          className="mx-auto grid max-w-md grid-cols-4 rounded-xl border border-border bg-card p-1"
          style={{ boxShadow: 'rgba(0,0,0,0.5) 0px 4px 30px 0px' }}
        >
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.href;
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1.5 text-xs font-medium transition-colors',
                  isActive ? 'text-[#85a6e9]' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span className={cn('rounded-lg p-1.5', isActive && 'bg-secondary')}>
                  <tab.icon className="h-4.5 w-4.5" />
                </span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
