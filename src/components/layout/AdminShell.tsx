import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  Calendar,
  PlaneTakeoff,
  History,
  Settings,
  Users,
  Building2,
  UserCog,
  ShieldCheck,
  User,
  LocateFixed,
  TriangleAlert,
  Bell,
  LogOut,
  ChevronDown,
  FolderKanban,
  Briefcase,
  DollarSign,
} from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDepartments } from '@/hooks/useDepartments';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { useNotifications } from '@/contexts/NotificationsContext';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: AppRole[];
  excludeRoles?: AppRole[];
}

interface NavGroup {
  key: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}


const SidebarBrand = memo(function SidebarBrand() {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <img
          src="/logo-control-asistencia.svg"
          alt="Control de Asistencia ELINEAS"
          className="h-11 w-11 rounded-xl object-cover"
          style={{ boxShadow: 'rgba(0,0,0,0.5) 0px 4px 12px 0px' }}
        />
        <div className="min-w-0">
          <h1 className="font-semibold text-sm leading-tight text-foreground" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}>
            Control de Asistencia
          </h1>
          <p className="text-sm leading-tight font-semibold text-[#85a6e9]">ELINEAS</p>
          <p className="text-xs text-muted-foreground mt-0.5">Gestión de asistencia</p>
        </div>
      </div>
      <NotificationBell />
    </div>
  );
});

const SIDEBAR_SCROLL_KEY = 'admin-shell-sidebar-scroll';
const navItems: NavItem[] = [
  { href: '/', label: 'Inicio', icon: LayoutDashboard },
  { href: '/attendance', label: 'Marcar', icon: Clock, excludeRoles: ['global_manager', 'superadmin'] },
  { href: '/history', label: 'Historial', icon: History, excludeRoles: ['global_manager', 'superadmin'] },
  { href: '/incidents', label: 'Incidencias', icon: TriangleAlert },
  { href: '/profile', label: 'Perfil', icon: User },
  { href: '/gps-diagnostics', label: 'Ubicación', icon: LocateFixed, excludeRoles: ['global_manager', 'superadmin'] },
  { href: '/notifications', label: 'Notificaciones', icon: Bell },
  { href: '/rest-schedule', label: 'Descansos', icon: Calendar },
  { href: '/vacations', label: 'Vacaciones', icon: PlaneTakeoff, excludeRoles: ['global_manager', 'superadmin'] },
  { href: '/department', label: 'Departamento', icon: Users, roles: ['department_head'] },
  { href: '/global', label: 'Panel Global', icon: Users, roles: ['global_manager', 'superadmin'] },
  { href: '/users', label: 'Usuarios', icon: UserCog, roles: ['global_manager', 'superadmin'] },
  { href: '/departments-admin', label: 'Departamentos', icon: Building2, roles: ['global_manager', 'superadmin'] },
  { href: '/configuration', label: 'Configuración', icon: Settings, roles: ['global_manager', 'superadmin'] },
  { href: '/nomina', label: 'Ajustes de nómina', icon: DollarSign, roles: ['global_manager', 'superadmin'] },
  { href: '/superadmin', label: 'Superadmin', icon: ShieldCheck, roles: ['superadmin'] },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [pendingIncidentsCount, setPendingIncidentsCount] = useState(0);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    attendance: true,
    management: true,
  });
  const { profile, role, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const desktopNavRef = useRef<HTMLElement | null>(null);
  const { departments } = useDepartments();
  const location = useLocation();

  const departmentName = departments.find((department) => department.id === profile?.department_id)?.name;

  const filteredNavItems = navItems.filter((item) => {
    if (role === 'employee' && item.href === '/') {
      return false;
    }
    if (item.excludeRoles && role && item.excludeRoles.includes(role)) {
      return false;
    }
    if (item.roles && (!role || !item.roles.includes(role))) {
      return false;
    }
    return true;
  });

  const groupedItems: NavGroup[] = [
    {
      key: 'attendance',
      label: 'Asistencia',
      icon: Briefcase,
      items: filteredNavItems.filter((item) =>
        ['/attendance', '/history', '/incidents', '/rest-schedule', '/vacations'].includes(item.href)
      ),
    },
    {
      key: 'management',
      label: 'Gestión',
      icon: FolderKanban,
      items: filteredNavItems.filter((item) =>
        ['/department', '/global', '/users', '/departments-admin', '/configuration', '/nomina', '/superadmin'].includes(item.href)
      ),
    },
  ].filter((group) => group.items.length > 0);

  const topLevelItems = filteredNavItems.filter((item) =>
    ['/', '/profile', '/gps-diagnostics', '/notifications'].includes(item.href)
  );

  const mobileVisibleItems = filteredNavItems.slice(0, 4);
  const mobileRemainderItems = filteredNavItems.slice(4);
  const mobileQuickAction =
    mobileRemainderItems.find((item) => item.href === '/configuration') ||
    mobileRemainderItems.find((item) => item.href === '/gps-diagnostics') ||
    mobileRemainderItems.find((item) => item.href === '/profile') ||
    filteredNavItems[0];
  const mobileOverflowItems = mobileRemainderItems.filter((item) => item.href !== mobileQuickAction?.href);

  const toggleGroup = (groupKey: string) => {
    setOpenGroups((current) => ({ ...current, [groupKey]: !current[groupKey] }));
  };


  useEffect(() => {
    const desktopSaved = window.sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    if (desktopSaved && desktopNavRef.current) {
      desktopNavRef.current.scrollTop = Number(desktopSaved);
    }
  }, []);

  useEffect(() => {
    const desktop = desktopNavRef.current;
    if (!desktop) return;

    const onScroll = () => window.sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(desktop.scrollTop));
    desktop.addEventListener('scroll', onScroll);

    return () => desktop.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fetchPendingIncidentsCount = async () => {
      if (!profile?.user_id) {
        setPendingIncidentsCount(0);
        return;
      }

      let query = supabase
        .from('attendance_incidents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (role === 'employee') {
        query = query.eq('user_id', profile.user_id);
      }

      const { count } = await query;
      setPendingIncidentsCount(count ?? 0);
    };

    void fetchPendingIncidentsCount();
    const intervalId = window.setInterval(() => void fetchPendingIncidentsCount(), 60000);
    return () => window.clearInterval(intervalId);
  }, [profile?.user_id, role]);

  const getBadgeCount = (href: string): number | null => {
    if (href === '/notifications') return unreadCount;
    if (href === '/incidents') return pendingIncidentsCount;
    return null;
  };

  const NavLinkItem = ({ item, nested = false }: { item: NavItem; nested?: boolean }) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => setMobileMoreOpen(false)}
            className={cn(
              'group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 text-sm',
              nested && 'pl-4',
              isActive
                ? 'bg-secondary text-foreground font-medium'
                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
            )}
          >
            <item.icon className={cn('h-4 w-4 shrink-0 transition-transform group-hover:scale-105', isActive && 'text-[#85a6e9]')} />
            <span className="text-sm">{item.label}</span>
            {getBadgeCount(item.href) !== null && (getBadgeCount(item.href) ?? 0) > 0 && (
              <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {getBadgeCount(item.href)}
              </span>
            )}
          </Link>
        );
  };

  const NavLinks = () => (
    <>
      {topLevelItems.map((item) => (
        <NavLinkItem key={item.href} item={item} />
      ))}

      {groupedItems.map((group) => {
        const isExpanded = openGroups[group.key] ?? true;
        const isGroupActive = group.items.some((item) => item.href === location.pathname);

        return (
          <div key={group.key}>
            <button
              type="button"
              onClick={() => toggleGroup(group.key)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest transition-colors border-none',
                isGroupActive ? 'text-[#85a6e9]' : 'text-muted-foreground/70 hover:text-muted-foreground'
              )}
            >
              <span className="inline-flex items-center gap-2">
                <group.icon className="h-3.5 w-3.5" />
                {group.label}
              </span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')} />
            </button>

            {isExpanded && (
              <div className="mt-0.5 space-y-0.5 mb-1">
                {group.items.map((item) => (
                  <NavLinkItem key={item.href} item={item} nested />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-3 left-0 right-0 z-50 px-4">
        {mobileMoreOpen && mobileOverflowItems.length > 0 && (
          <div
            className="mx-auto mb-2 max-w-md rounded-xl border border-border bg-card p-2"
            style={{ boxShadow: 'rgba(0,0,0,0.5) 0px 4px 30px 0px' }}
          >
            <div className="grid grid-cols-2 gap-1">
              {mobileOverflowItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMoreOpen(false)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors',
                      isActive ? 'bg-secondary text-[#85a6e9]' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                    )}
                  >
                    <div className="relative">
                      <item.icon className="h-4 w-4" />
                      {getBadgeCount(item.href) !== null && (getBadgeCount(item.href) ?? 0) > 0 && (
                        <span className="absolute -right-2 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-white">
                          {getBadgeCount(item.href)}
                        </span>
                      )}
                    </div>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setMobileMoreOpen(false);
                  void signOut();
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        )}

        <div
          className="mx-auto grid max-w-md grid-cols-6 rounded-xl border border-border bg-card p-1"
          style={{ boxShadow: 'rgba(0,0,0,0.5) 0px 4px 30px 0px' }}
        >
          {mobileVisibleItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium transition-colors',
                  isActive ? 'text-[#85a6e9]' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className={cn('relative rounded-lg p-1.5', isActive && 'bg-secondary')}>
                  <item.icon className="h-4 w-4" />
                  {getBadgeCount(item.href) !== null && (getBadgeCount(item.href) ?? 0) > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-white">
                      {getBadgeCount(item.href)}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
          <Link
            to={mobileQuickAction?.href ?? '/'}
            className={cn(
              'flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium transition-colors',
              location.pathname === mobileQuickAction?.href ? 'text-[#85a6e9]' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className={cn('rounded-lg p-1.5', location.pathname === mobileQuickAction?.href && 'bg-secondary')}>
              {mobileQuickAction ? <mobileQuickAction.icon className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
            </div>
          </Link>
          {mobileOverflowItems.length > 0 && (
            <button
              type="button"
              onClick={() => setMobileMoreOpen((current) => !current)}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium transition-colors',
                mobileMoreOpen ? 'text-[#85a6e9]' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn('rounded-lg p-1.5', mobileMoreOpen && 'bg-secondary')}>
                <span className="text-base leading-none">{mobileMoreOpen ? '✕' : '☰'}</span>
              </div>
              <span className="sr-only">Más</span>
            </button>
          )}
          {mobileOverflowItems.length === 0 && (
            <button
              type="button"
              disabled
              className="flex min-h-14 items-center justify-center rounded-lg text-[11px] font-medium text-muted-foreground/40"
            >
              <span className="text-base leading-none">☰</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop sidebar — Deep Sea elevated surface */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:bottom-0 lg:w-64 bg-card border-r border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <SidebarBrand />
        </div>
        <nav ref={desktopNavRef} className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-border shrink-0">
          <div className="mb-3">
            <p className="font-medium text-sm text-foreground">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{role?.replace('_', ' ')}</p>
            <p className="text-xs text-muted-foreground">Dpto: {departmentName || 'Sin departamento'}</p>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="lg:pl-64 pb-20 lg:pb-0 min-h-screen">
        <div className="p-3 lg:p-6 max-w-[1600px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
