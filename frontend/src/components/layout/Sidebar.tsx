import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Activity,
  Banknote,
  Building2,
  CalendarClock,
  Camera,
  Coffee,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
  adminOnly?: boolean;
  employeeOnly?: boolean;
};

export default function Sidebar({
  collapsed,
  mobileOpen,
  onClose,
  onToggle
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}) {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return;
        const res = await axios.get('/api/requests/pending-count', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPendingCount(res.data.totalBadgeCount || 0);
      } catch (e) {
        // ignore
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems: NavItem[] = [
    ...(hasPermission('dashboard.view') ? [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }] : []),
    ...(hasPermission('attendance.create') ? [{ label: 'Absensi Selfie', to: '/dashboard/attendance', icon: Camera }] : []),
    ...(hasPermission('attendance.view') ? [{ label: 'Monitoring', to: '/dashboard/attendance-monitoring', icon: Activity, badge: 'Live' }] : []),
    ...(hasPermission('employee.view') ? [{ label: 'Karyawan', to: '/dashboard/employees', icon: Users }] : []),
    ...(hasPermission('shift.view') ? [{ label: 'Shift Kerja', to: '/dashboard/shifts', icon: CalendarClock }] : []),
    ...(hasPermission('request_center.view') ? [{ label: 'Request Center', to: '/dashboard/requests', icon: FileText, badge: pendingCount > 0 ? `${pendingCount}` : undefined }] : []),
    ...(hasPermission('user_management.create_user') || hasPermission('user_management.edit_user') || hasPermission('user_management.delete_user') || hasPermission('user_management.reset_password') ? [{ label: 'Role & Permissions', to: '/dashboard/roles', icon: ShieldCheck }] : []),
    ...(hasPermission('salary.view') ? [
      { label: 'Aturan Gaji', to: '/dashboard/salary-rules', icon: Receipt },
      { label: 'Penggajian', to: '/dashboard/payroll', icon: Banknote }
    ] : []),
    ...(hasPermission('reports.view') ? [{ label: 'Laporan', to: '/dashboard/reports', icon: FileSpreadsheet }] : []),
    ...(hasPermission('company_profile.view') ? [{ label: 'Profil Perusahaan', to: '/dashboard/company-profile', icon: Building2 }] : []),
    ...(hasPermission('settings.view') ? [{ label: 'Pengaturan', to: '/dashboard/settings', icon: Settings }] : [])
  ];

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-slate-200/80 bg-white/75 backdrop-blur-2xl transition-all duration-300 dark:border-slate-800/70 dark:bg-slate-950/75',
        mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0',
        'w-72',
        collapsed ? 'lg:w-20' : 'lg:w-72'
      )}
    >
      <div
        className={cn(
          'flex h-20 items-center justify-between border-b border-slate-200/70 px-4 dark:border-slate-800/70',
          collapsed && 'lg:justify-center lg:px-0'
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6F4E37] via-[#C89B6D] to-[#F4E7D3] text-white shadow-lg shadow-[#6F4E37]/20">
            <Coffee className="h-5 w-5" />
          </div>
          <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
            <p className="truncate text-sm font-semibold tracking-[0.24em] text-slate-700 dark:text-slate-100">KOPI SELON</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">Employee System</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'hidden rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:inline-flex dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
            collapsed && 'lg:hidden'
          )}
          aria-label="Sembunyikan sidebar"
          title="Sembunyikan sidebar"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <div className={cn('flex-1 overflow-y-auto px-3 py-4', collapsed && 'lg:px-2')}>
        <div
          className={cn(
            'mb-4 rounded-2xl border border-[#f0e0cc] bg-gradient-to-br from-[#fff7ec] to-[#fdfaf4] p-3 text-sm shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/80',
            collapsed && 'lg:mx-auto lg:flex lg:h-12 lg:w-12 lg:items-center lg:justify-center lg:p-0'
          )}
          title={collapsed ? 'Workspace premium' : undefined}
        >
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6F4E37] dark:text-[#e9c79b]">
            <Sparkles className={cn('h-3.5 w-3.5 shrink-0', collapsed && 'lg:h-4 lg:w-4')} />
            <span className={cn(collapsed && 'lg:hidden')}>Workspace premium</span>
          </div>
          <p className={cn('mt-2 text-sm text-slate-600 dark:text-slate-300', collapsed && 'lg:hidden')}>
            Pantau absensi, karyawan, dan shift dengan pengalaman yang lebih modern.
          </p>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (mobileOpen) onClose();
                }}
                aria-label={collapsed ? item.label : undefined}
                title={collapsed ? item.label : undefined}
                className={({ isActive: linkActive }) =>
                  cn(
                    'group flex items-center rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f8efe6] dark:hover:bg-slate-800',
                    'gap-3',
                    collapsed && 'lg:justify-center lg:px-1 lg:py-2.5',
                    linkActive || isActive ? 'bg-[#f4e7d3] text-[#6F4E37] shadow-sm dark:bg-slate-800 dark:text-[#f4cda4]' : 'text-slate-600 dark:text-slate-300'
                  )
                }
              >
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-slate-600 shadow-sm transition group-hover:scale-105 dark:bg-slate-900/80 dark:text-slate-200">
                  <Icon className="h-4 w-4" />
                  {item.badge ? (
                    <span
                      className={cn(
                        'absolute -right-1 -top-1 rounded-full border border-white bg-[#22C55E] px-1.5 py-0.5 text-[10px] font-semibold text-white dark:border-slate-950',
                        collapsed && 'lg:right-0 lg:top-0 lg:h-2.5 lg:w-2.5 lg:p-0 lg:text-[0px]'
                      )}
                      aria-label={item.badge}
                    >
                      <span className={cn(collapsed && 'lg:hidden')}>{item.badge}</span>
                    </span>
                  ) : null}
                </div>
                <span className={cn('flex-1 text-left', collapsed && 'lg:hidden')}>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className={cn('border-t border-slate-200/70 p-4 dark:border-slate-800/70', collapsed && 'lg:px-2 lg:py-3')}>
        <div
          className={cn(
            'rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70',
            collapsed && 'lg:flex lg:flex-col lg:items-center lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none dark:lg:bg-transparent'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#6F4E37] text-sm font-semibold text-white">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.username || 'User'}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.role || 'Member'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className={cn(
              'mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30',
              collapsed && 'lg:h-10 lg:w-10 lg:p-0'
            )}
            aria-label={collapsed ? 'Logout' : undefined}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="h-4 w-4" />
            <span className={cn(collapsed && 'lg:hidden')}>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
