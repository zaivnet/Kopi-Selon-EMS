import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Coffee,
  ListCheck,
  RefreshCw,
  Users,
  Workflow
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, Button, EmptyState } from '@/components/ui/design-system';
import { useAuth } from '@/context/AuthContext';

type DashboardSummary = {
  stats: {
    totalEmployees: number;
    presentToday: number;
    currentlyWorking: number;
    lateToday: number;
    absentToday: number;
  };
  recentActivity: Array<{
    id: string;
    employeeId: string;
    employeeName: string;
    position: string | null;
    action: 'CHECK_IN' | 'CHECK_OUT';
    timestamp: string;
    status: 'ON_TIME' | 'LATE' | 'COMPLETED';
  }>;
  workingNow: Array<{
    attendanceId: string;
    employeeId: string;
    employeeName: string;
    position: string | null;
    shift: { name: string; startTime: string; endTime: string } | null;
    clockIn: string;
    elapsedMinutes: number;
  }>;
  todayShifts: Array<{
    employeeId: string;
    employeeName: string;
    position: string | null;
    shift: { name: string; startTime: string; endTime: string };
    status: 'WORKING' | 'PENDING' | 'COMPLETED' | 'ABSENT';
  }>;
};

export default function StaffDashboard() {
  const navigate = useNavigate();

  const summaryQuery = useQuery<DashboardSummary>({
    queryKey: ['staff-dashboard-summary'],
    queryFn: async () => (await api.get('/dashboard/summary')).data,
    refetchInterval: 30_000
  });

  if (summaryQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-amber-500/10 dark:bg-amber-950/20" />
          ))}
        </div>
      </div>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <Card className="border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20">
        <CardContent className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
            <AlertCircle className="h-6 w-6" />
          </span>
          <h2 className="font-semibold text-slate-900 dark:text-white">Gagal memuat data operasional staff</h2>
          <Button onClick={() => summaryQuery.refetch()} className="mt-4 gap-2">
            <RefreshCw className="h-4 w-4" /> Coba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  const summary = summaryQuery.data;
  const stats = summary.stats;
  const { hasPermission } = useAuth();

  const quickActions = [
    hasPermission('attendance.view') && { label: 'Kelola Presensi', desc: 'Monitoring & edit presensi', path: '/dashboard/attendance-monitoring', icon: Activity },
    hasPermission('employee.view') && { label: 'Data Karyawan', desc: 'Daftar barista & staff toko', path: '/dashboard/employees', icon: Users },
    hasPermission('shift.view') && { label: 'Jadwal Shift', desc: 'Atur penugasan jam kerja', path: '/dashboard/shifts', icon: CalendarClock },
    hasPermission('reports.view') && { label: 'Laporan Absensi', desc: 'Cetak & unduh rekap data', path: '/dashboard/reports', icon: ListCheck }
  ].filter(Boolean) as Array<{ label: string; desc: string; path: string; icon: typeof Activity }>;
  return (
    <div className="space-y-6">
      {/* Store Operations Real Header */}
      <section className="relative overflow-hidden rounded-[20px] sm:rounded-[28px] border border-amber-500/20 bg-gradient-to-br from-[#fffdfa] via-[#fdf6ec] to-[#f5ebdc] p-3.5 sm:p-5 lg:p-7 shadow-sm dark:border-[#3e2e24] dark:from-[#241a13] dark:via-[#1e1510] dark:to-[#17100b]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
              <Coffee className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="truncate">Store Supervisor Operations · Real Data</span>
            </div>
            <h2 className="mt-2 text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-tight leading-snug text-slate-900 dark:text-amber-50">
              Pengawasan Operasional Toko Harian
            </h2>
            <p className="mt-1 text-xs sm:text-sm font-medium leading-relaxed text-slate-600 dark:text-amber-200/80">
              Monitor karyawan bertugas, presensi fisik di outlet, dan penugasan shift real-time.
            </p>
          </div>
          <Badge variant="warning" className="w-fit px-2.5 py-1 text-[11px] font-bold">
            ⚡ Direct Operation Mode
          </Badge>
        </div>
      </section>

      {/* Real Metric Cards */}
      <section className="grid gap-3.5 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: 'Tercatat Hadir Hari Ini', value: `${stats.presentToday} Staf`, caption: `Dari total ${stats.totalEmployees} karyawan`, icon: CheckCircle2 },
          { title: 'Aktif Bekerja Saat Ini', value: `${stats.currentlyWorking} Staf`, caption: 'Clocked-in di lokasi', icon: Workflow },
          { title: 'Terlambat Hari Ini', value: `${stats.lateToday} Staf`, caption: 'Catatan terlambat terekam', icon: Activity },
          { title: 'Belum Presensi', value: `${stats.absentToday} Staf`, caption: 'Ada shift tetapi belum absen', icon: Clock3 }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-amber-500/15 bg-white/90 shadow-sm dark:border-[#3a2b20] dark:bg-[#221812]">
              <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-amber-400/80 leading-snug">{stat.title}</p>
                  <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-slate-900 dark:text-amber-50">{stat.value}</p>
                  <p className="mt-1.5 text-xs font-medium leading-normal text-amber-700 dark:text-amber-300/80 truncate">{stat.caption}</p>
                </div>
                <span className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                  <Icon className="h-5 w-5" />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Real Staff On Duty & Today's Shift List */}
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-amber-500/20 bg-white dark:border-[#3a2b20] dark:bg-[#221812]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-amber-100">Karyawan Sedang Bekerja (Real Floor)</CardTitle>
              <p className="mt-1 text-xs text-slate-500 dark:text-amber-300/60">Daftar staf yang sudah clock-in dan belum clock-out</p>
            </div>
            <Badge variant="success">Live Active</Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {summary.workingNow.length ? (
              summary.workingNow.map((item) => (
                <div key={item.attendanceId} className="flex items-center justify-between rounded-2xl border border-amber-500/15 bg-amber-500/5 p-3.5 dark:border-amber-900/30 dark:bg-amber-950/20">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 font-bold text-amber-800 dark:text-amber-200">
                      {item.employeeName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-amber-100">{item.employeeName}</p>
                      <p className="text-xs text-slate-500 dark:text-amber-300/70">{item.position || 'Karyawan'} · Shift {item.shift?.name || 'Reguler'}</p>
                    </div>
                  </div>
                  <Badge variant="success">Active ({item.elapsedMinutes}m)</Badge>
                </div>
              ))
            ) : (
              <EmptyState title="Tidak ada karyawan aktif" description="Saat ini belum ada karyawan yang sedang bekerja di outlet." />
            )}
          </CardContent>
        </Card>

        {/* Today's Shift Assignments */}
        <Card className="border-amber-500/20 bg-white dark:border-[#3a2b20] dark:bg-[#221812]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-amber-100">Jadwal Shift Toko Hari Ini</CardTitle>
              <p className="mt-1 text-xs text-slate-500 dark:text-amber-300/60">Roster shift resmi karyawan</p>
            </div>
            <Badge variant="neutral">{summary.todayShifts.length} Penugasan</Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {summary.todayShifts.length ? (
              summary.todayShifts.map((shift) => (
                <div key={shift.employeeId} className="flex items-center justify-between rounded-xl border border-amber-500/15 bg-amber-500/5 p-3 dark:border-amber-900/20 dark:bg-amber-950/10">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-amber-100">{shift.employeeName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-amber-300/70">{shift.shift.name}: {shift.shift.startTime} - {shift.shift.endTime}</p>
                  </div>
                  <Badge variant={shift.status === 'WORKING' ? 'success' : shift.status === 'COMPLETED' ? 'info' : shift.status === 'ABSENT' ? 'danger' : 'neutral'}>
                    {shift.status}
                  </Badge>
                </div>
              ))
            ) : (
              <EmptyState title="Belum ada penugasan shift" description="Atur jadwal shift melalui menu Penugasan Shift." />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Real Quick Action Launchers */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3.5 rounded-[22px] border border-amber-500/20 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-500/40 hover:bg-amber-500/5 dark:border-[#3a2b20] dark:bg-[#221812]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-amber-100">{item.label}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-amber-300/60">{item.desc}</p>
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}
