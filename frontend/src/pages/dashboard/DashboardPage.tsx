import { Coffee, ShieldCheck, Store, UserCheck, Briefcase } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AdminDashboard from './components/AdminDashboard';
import OwnerDashboard from './components/OwnerDashboard';
import StaffDashboard from './components/StaffDashboard';
import EmployeePortalDashboard from './components/EmployeePortalDashboard';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  const role = typeof user.role === 'string' ? user.role : (user.role as any)?.name || '';
  const isAdmin = role === 'Administrator';
  const isOwner = role === 'Owner';
  const isStaff = role === 'Staff';
  const isEmployee = role === 'Karyawan';

  const roleConfig = {
    Administrator: { icon: ShieldCheck, badge: 'System Central', desc: 'Kelola absensi, data karyawan, shift, & audit log operasional' },
    Owner: { icon: Store, badge: 'Executive Analytics', desc: 'Insight performa outlet, estimasi payroll, & analisa kedisiplinan' },
    Staff: { icon: Briefcase, badge: 'Store Operations', desc: 'Monitor shift barista, approval tukar shift, & checklist toko' },
    Karyawan: { icon: UserCheck, badge: 'Employee Portal', desc: 'Absensi cepat radius GPS, jadwal shift, & pengajuan cuti' }
  }[role] || { icon: Coffee, badge: 'Kopi Selon EMS', desc: 'Sistem Manajemen & Absensi Karyawan Kopi Selon' };

  const RoleIcon = roleConfig.icon;

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[20px] sm:rounded-[28px] border border-[#e5d4bc]/80 bg-gradient-to-br from-[#fffdfa] via-[#fdf8f0] to-[#f4e7d3] p-3.5 sm:p-5 lg:p-7 shadow-sm dark:border-[#3e2e24] dark:from-[#261c16] dark:via-[#1e1611] dark:to-[#17100c]">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-3.5 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
              <Coffee className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="truncate">Kopi Selon EMS · {roleConfig.badge}</span>
            </div>
            <h1 className="mt-2 text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-tight leading-snug text-slate-900 dark:text-amber-50">
              Selamat datang kembali, <span className="whitespace-nowrap text-amber-700 dark:text-amber-400">{user.username} 👋</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-medium leading-relaxed text-slate-600 dark:text-amber-200/80">
              {roleConfig.desc}
            </p>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl sm:rounded-2xl border border-amber-500/20 bg-white/85 p-2.5 sm:p-3.5 shadow-sm backdrop-blur dark:border-amber-900/40 dark:bg-[#1f1611]/85">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              <RoleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-amber-100">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {role} Active Session
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-amber-300/70">Sistem terhubung real-time</p>
            </div>
          </div>
        </div>
      </section>

      {isAdmin ? <AdminDashboard /> : null}
      {isOwner ? <OwnerDashboard /> : null}
      {isStaff ? <StaffDashboard /> : null}
      {isEmployee ? <EmployeePortalDashboard /> : null}
    </div>
  );
}

