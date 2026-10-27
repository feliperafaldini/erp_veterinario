import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABEL, primaryRole } from '../lib/roles';
import {
  CalendarDays,
  ClipboardList,
  Home,
  LayoutDashboard,
  LogOut,
  Package,
  PawPrint,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

const VET_NAV: NavItem[] = [
  { to: '/inicio', label: 'Início', icon: Home },
  { to: '/dashboard', label: 'Agenda', icon: LayoutDashboard },
  { to: '/tutores', label: 'Tutores', icon: Users },
  { to: '/animais', label: 'Animais', icon: PawPrint },
  { to: '/agendamentos', label: 'Agendamentos', icon: CalendarDays },
];

const RECEPTION_NAV: NavItem[] = [
  { to: '/inicio', label: 'Início', icon: Home },
  { to: '/recepcao', label: 'Recepção', icon: ClipboardList },
  { to: '/agendamentos', label: 'Agendamentos', icon: CalendarDays },
  { to: '/tutores', label: 'Tutores', icon: Users },
  { to: '/animais', label: 'Animais', icon: PawPrint },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/inicio', label: 'Início', icon: Home },
  { to: '/admin', label: 'Painel', icon: LayoutDashboard },
  { to: '/admin/equipe', label: 'Equipe', icon: UserCog },
  { to: '/admin/estoque', label: 'Estoque', icon: Package },
  { to: '/admin/custos', label: 'Custos', icon: Wallet },
  { to: '/dashboard', label: 'Agenda', icon: CalendarDays },
  { to: '/tutores', label: 'Tutores', icon: Users },
  { to: '/animais', label: 'Animais', icon: PawPrint },
];

function initials(value: string | undefined | null, fallback: string): string {
  if (!value) return fallback;
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function navForRole(role: string | null): NavItem[] {
  if (role === 'ADMIN') return ADMIN_NAV;
  if (role === 'RECEPTIONIST') return RECEPTION_NAV;
  return VET_NAV;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, activeTenant, roles, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const role = primaryRole(roles);
  const navItems = navForRole(role);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const clinicName = activeTenant?.name ?? 'Clínica';
  const clinicInitials = initials(clinicName, 'CL');
  const userInitials = initials(user?.name, 'U');

  return (
    <div className="min-h-screen flex bg-ground">
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`fixed left-0 top-0 h-screen bg-surface border-r border-line z-40 flex flex-col transition-[width] duration-200 ease-rail ${
          expanded ? 'w-[232px]' : 'w-16'
        }`}
      >
        <div className="h-14 flex items-center gap-3 px-4 border-b border-line shrink-0">
          <span className="h-8 w-8 shrink-0 rounded-md bg-ink text-white grid place-items-center text-[11px] font-semibold tracking-wide">
            {clinicInitials}
          </span>
          <span
            className={`text-body font-medium text-ink truncate transition-opacity duration-150 ${
              expanded ? 'opacity-100 delay-75' : 'opacity-0'
            }`}
          >
            {clinicName}
          </span>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const active =
              location.pathname === item.to ||
              (item.to !== '/admin' && location.pathname.startsWith(`${item.to}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={expanded ? undefined : item.label}
                aria-current={active ? 'page' : undefined}
                className={`h-10 flex items-center gap-3 px-3 rounded-md transition-colors duration-150 ${
                  active ? 'bg-accent-soft text-ink' : 'text-ink-2 hover:bg-[#f6f6f7] hover:text-ink'
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 1.9 : 1.6}
                  className={`shrink-0 ${active ? 'text-accent' : ''}`}
                />
                <span
                  className={`text-body whitespace-nowrap transition-opacity duration-150 ${
                    expanded ? 'opacity-100 delay-75' : 'opacity-0'
                  } ${active ? 'font-medium' : ''}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="px-2 py-3 border-t border-line shrink-0">
          <div className="h-10 flex items-center gap-3 px-3">
            <span className="h-7 w-7 shrink-0 rounded-full bg-[#f2f2f4] text-ink-2 grid place-items-center text-[10px] font-semibold">
              {userInitials}
            </span>
            <div
              className={`flex-1 min-w-0 transition-opacity duration-150 ${
                expanded ? 'opacity-100 delay-75' : 'opacity-0'
              }`}
            >
              <p className="text-meta text-ink-2 truncate">{user?.name}</p>
              <p className="text-micro text-ink-4 truncate">{role ? ROLE_LABEL[role] : ''}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              aria-label="Sair"
              className={`shrink-0 h-7 w-7 grid place-items-center rounded-md text-ink-3 hover:bg-[#f2f2f4] hover:text-ink transition-opacity duration-150 ${
                expanded ? 'opacity-100 delay-75' : 'opacity-0 pointer-events-none'
              }`}
            >
              <LogOut size={16} strokeWidth={1.6} />
            </button>
          </div>
        </div>
      </aside>

      <main
        className={`flex-1 min-w-0 transition-[margin] duration-200 ease-rail ${
          expanded ? 'ml-[232px]' : 'ml-16'
        }`}
      >
        <div className="mx-auto w-full max-w-[1180px] px-8 py-7">{children}</div>
      </main>
    </div>
  );
}
