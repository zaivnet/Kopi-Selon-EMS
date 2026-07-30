import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coffee,
  FileBarChart2,
  LogIn,
  LogOut,
  MessageSquareText,
  PlusCircle,
  RefreshCw,
  Sparkles,
  Users,
  UserPlus,
  Warehouse
} from 'lucide-react';
import { io } from 'socket.io-client';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, Badge, Button, EmptyState } from '@/components/ui/design-system';

type DashboardSummary = {
  generatedAt: string;
  timezone: string;
  stats: {
    totalEmployees: number;
    presentToday: number;
    currentlyWorking: number;
    lateToday: number;
    absentToday: number;
    absentDefinition: string;
  };
  weeklyTrend: Array<{ date: string; present: number; late: number }>;
  recentActivity: Array<{
    id: string;
    employeeId: string;
    employeeName: string;
    position: string | null;
    action: 'CHECK_IN' | 'CHECK_OUT';
    timestamp: string;
    status: 'ON_TIME' | 'LATE' | 'COMPLETED';
    photoUrl: string | null;
  }>;
  workingNow: Array<{
    attendanceId: string;
    employeeId: string;
    employeeName: string;
    position: string | null;
    employeePhotoUrl: string | null;
    shift: { name: string; startTime: string; endTime: string } | null;
    clockIn: string;
    elapsedMinutes: number;
    selfieUrl: string | null;
  }>;
  todayShifts: Array<{
    employeeId: string;
    employeeName: string;
    position: string | null;
    employeePhotoUrl: string | null;
    shift: { name: string; startTime: string; endTime: string };
    status: 'WORKING' | 'PENDING' | 'COMPLETED' | 'ABSENT';
  }>;
};

const timeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});
const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  weekday: 'short',
  day: 'numeric',
  month: 'short'
});
const shortDayFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  weekday: 'short'
});

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${remaining} menit`;
  return `${hours}j ${remaining}m`;
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

function Avatar({
  name,
  src = null,
  className = 'h-10 w-10',
  size
}: {
  name: string;
  src?: string | null;
  className?: string;
  size?: string;
}) {
  const sizeClasses = size === 'sm' ? 'h-8 w-8 text-[10px]' : size === 'md' ? 'h-10 w-10 text-xs' : className;
  return src ? (
    <img src={src} alt={`Foto ${name}`} className={`${sizeClasses} shrink-0 rounded-lg object-cover ring-1 ring-border`} />
  ) : (
    <span className={`${sizeClasses} flex shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-xs font-bold text-amber-800 ring-1 ring-amber-500/20 dark:bg-amber-500/20 dark:text-amber-200`}>
      {initials(name)}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Memuat ringkasan dashboard" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-xl border bg-muted/50" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-7">
        <div className="h-[390px] animate-pulse rounded-xl border bg-muted/50 xl:col-span-4" />
        <div className="h-[390px] animate-pulse rounded-xl border bg-muted/50 xl:col-span-3" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl border bg-muted/50" />
        <div className="h-72 animate-pulse rounded-xl border bg-muted/50" />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const summaryQuery = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await api.get('/dashboard/summary')).data,
    refetchInterval: 60_000
  });

  useEffect(() => {
    const socket = io();
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    socket.on('attendance_update', refresh);
    return () => {
      socket.off('attendance_update', refresh);
      socket.disconnect();
    };
  }, [queryClient]);

  if (summaryQuery.isLoading) return <DashboardSkeleton />;

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <Card className="border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20">
        <CardContent className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
            <AlertCircle className="h-6 w-6" />
          </span>
          <h2 className="font-semibold">Ringkasan dashboard gagal dimuat</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Periksa koneksi atau coba muat ulang data. Data absensi tidak diubah.
          </p>
          <button
            type="button"
            onClick={() => summaryQuery.refetch()}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </button>
        </CardContent>
      </Card>
    );
  }

  const summary = summaryQuery.data;
  const trendData = summary.weeklyTrend.map((item) => ({
    ...item,
    label: shortDayFormatter.format(new Date(`${item.date}T12:00:00+07:00`))
  }));
  const hasTrend = summary.weeklyTrend.some((item) => item.present || item.late);
  const statCards = [
    {
      title: 'Total Karyawan',
      value: summary.stats.totalEmployees,
      caption: 'Karyawan dan staff aktif',
      icon: Users,
      color: 'text-slate-500',
      surface: 'bg-slate-50 dark:bg-slate-900'
    },
    {
      title: 'Hadir Hari Ini',
      value: summary.stats.presentToday,
      caption: `${summary.stats.currentlyWorking} sedang bekerja`,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      surface: 'bg-emerald-50 dark:bg-emerald-950/40'
    },
    {
      title: 'Terlambat Hari Ini',
      value: summary.stats.lateToday,
      caption: 'Masuk setelah jam shift',
      icon: Clock3,
      color: 'text-amber-600',
      surface: 'bg-amber-50 dark:bg-amber-950/40'
    },
    {
      title: 'Tidak Hadir Hari Ini',
      value: summary.stats.absentToday,
      caption: 'Belum memiliki catatan absensi',
      icon: AlertCircle,
      color: 'text-red-600',
      surface: 'bg-red-50 dark:bg-red-950/40'
    }
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden border border-amber-500/20 bg-gradient-to-br from-[#fffdfa] via-[#fdf8f0] to-[#f4e7d3] dark:border-[#3e2e24] dark:from-[#241a13] dark:via-[#1e1510] dark:to-[#17100b]">
          <div className="flex flex-col gap-5 p-5 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-300">Selamat Datang</p>
                <h2 className="mt-1.5 text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight text-slate-900 dark:text-amber-50">Administrator Control Center</h2>
              </div>
              <Badge variant="success">Realtime</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button size="md">Tambah Karyawan</Button>
              <Button variant="secondary" size="md">Lihat Absensi</Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-amber-500/15 bg-white/80 p-3.5 sm:p-4 shadow-sm dark:border-amber-900/30 dark:bg-[#1f1611]/80">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-amber-400/80">Hari Ini</p>
                <p className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-slate-900 dark:text-amber-50">{summary.stats.presentToday}</p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-amber-300/70">Karyawan hadir</p>
              </div>
              <div className="rounded-2xl border border-amber-500/15 bg-white/80 p-3.5 sm:p-4 shadow-sm dark:border-amber-900/30 dark:bg-[#1f1611]/80">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-amber-400/80">Terlambat</p>
                <p className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-slate-900 dark:text-amber-50">{summary.stats.lateToday}</p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-amber-300/70">Setelah jam shift</p>
              </div>
              <div className="rounded-2xl border border-amber-500/15 bg-white/80 p-3.5 sm:p-4 shadow-sm dark:border-amber-900/30 dark:bg-[#1f1611]/80">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-amber-400/80">Shift</p>
                <p className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-slate-900 dark:text-amber-50">{summary.todayShifts.length}</p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-amber-300/70">Penugasan hari ini</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-amber-500/20 bg-white dark:border-[#3a2b20] dark:bg-[#221812]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
              <CalendarDays className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Calendar Agenda
            </CardTitle>
            <Badge variant="neutral">Agenda Toko</Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-3.5 dark:border-amber-900/30 dark:bg-amber-950/20">
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-amber-100">Shift Puncak Kopi Selon</p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/70">08.00 - 17.00 WIB · 12 Barista & Crew</p>
            </div>
            <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-3.5 dark:border-amber-900/30 dark:bg-amber-950/20">
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-amber-100">Rapat Evaluasi Shift</p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/70">14.00 WIB · Ruang Briefing</p>
            </div>
            <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-3.5 dark:border-amber-900/30 dark:bg-amber-950/20">
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-amber-100">Pengumuman Target Bulanan</p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/70">Review target penjualan & kedisiplinan</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3.5 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Statistik absensi hari ini">
        {statCards.map((stat) => (
          <Card key={stat.title} className="group cursor-pointer overflow-hidden border-amber-500/15 bg-white/90 dark:border-[#3a2b20] dark:bg-[#221812]">
            <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-amber-400/80 leading-snug">{stat.title}</p>
                <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-slate-900 dark:text-amber-50">{stat.value}</p>
                <p className="mt-1.5 text-xs font-medium leading-normal text-amber-700 dark:text-amber-300/80 truncate">{stat.caption}</p>
              </div>
              <span className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 ${stat.surface} ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Grafik Mingguan</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Perbandingan kehadiran dan keterlambatan.</p>
            </div>
            <Badge variant="info">Weekly</Badge>
          </CardHeader>
          <CardContent className="pt-3">
            {hasTrend ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 10, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashboardPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="dashboardLate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      labelFormatter={(_label, payload) =>
                        payload?.[0]?.payload?.date
                          ? dateFormatter.format(new Date(`${payload[0].payload.date}T12:00:00+07:00`))
                          : ''
                      }
                      formatter={(value, name) => [value, name === 'present' ? 'Hadir' : 'Terlambat']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '16px'
                      }}
                    />
                    <Legend formatter={(value) => (value === 'present' ? 'Hadir' : 'Terlambat')} />
                    <Area type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} fill="url(#dashboardPresent)" />
                    <Area type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} fill="url(#dashboardLate)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[300px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 text-center dark:border-slate-800 dark:bg-slate-900/70">
                <Activity className="mb-3 h-8 w-8 text-slate-400" />
                <p className="font-medium">Belum ada absensi dalam 7 hari terakhir</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Quick Actions</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Akses cepat operasional.</p>
            </div>
            <Badge variant="warning">Fast</Badge>
          </CardHeader>
          <CardContent className="grid gap-3">
            {[
              { label: 'Tambah Karyawan', icon: UserPlus, description: 'Buat akun baru' },
              { label: 'Tambah Shift', icon: PlusCircle, description: 'Atur jadwal' },
              { label: 'Lihat Absensi', icon: FileBarChart2, description: 'Pantau harian' },
              { label: 'Laporan', icon: Warehouse, description: 'Ekspor data' }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F4E7D3] text-[#6F4E37] dark:bg-slate-800 dark:text-[#f4cda4]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </button>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Aktivitas terbaru dari seluruh karyawan.</p>
            </div>
            <Badge variant="success">Live</Badge>
          </CardHeader>
          <CardContent>
            {summary.recentActivity.length ? (
              <div className="space-y-2">
                {summary.recentActivity.map((activity) => {
                  const checkIn = activity.action === 'CHECK_IN';
                  const late = activity.status === 'LATE';
                  return (
                    <div key={activity.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 transition hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-800/70">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${checkIn ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'}`}>
                        {checkIn ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{activity.employeeName}</p>
                        <p className="text-xs text-slate-500">{checkIn ? 'Check-in' : 'Check-out'} · {activity.position || 'Karyawan'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{timeFormatter.format(new Date(activity.timestamp))}</p>
                        <p className={`text-[11px] font-medium ${late ? 'text-amber-600' : checkIn ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {late ? 'Terlambat' : checkIn ? 'Tepat waktu' : 'Selesai'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="Belum ada aktivitas" description="Aktivitas absensi terbaru akan muncul secara otomatis di sini." />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2">
                <Coffee className="h-5 w-5 text-[#6F4E37]" />
                Realtime Attendance
              </CardTitle>
              <Badge variant="warning">Monitor</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Sedang Bekerja</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{summary.workingNow.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Sudah Pulang</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{summary.stats.presentToday - summary.workingNow.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 text-[#6F4E37]" />
                Announcement
              </CardTitle>
              <Badge variant="neutral">Today</Badge>
            </CardHeader>
            <CardContent>
              <Alert title="Pengumuman penting" description="Periksa laporan bulanan sebelum pukul 17.00." variant="default" icon={<Sparkles className="h-4 w-4" />} />
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <Avatar name="Tim Ops" size="sm" />
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Tim Operasional</p>
                  <p className="text-xs text-slate-500">Update terakhir 10 menit lalu</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Shift Hari Ini</CardTitle>
            <Badge variant="warning">{summary.todayShifts.length} penugasan</Badge>
          </CardHeader>
          <CardContent>
            {summary.todayShifts.length ? (
              <div className="space-y-2">
                {summary.todayShifts.map((item) => {
                  const status = {
                    WORKING: { label: 'Bekerja', classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
                    PENDING: { label: 'Menunggu', classes: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
                    COMPLETED: { label: 'Selesai', classes: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' },
                    ABSENT: { label: 'Tidak hadir', classes: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300' }
                  }[item.status];
                  return (
                    <div key={item.employeeId} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                      <Avatar name={item.employeeName} src={item.employeePhotoUrl} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{item.employeeName}</p>
                        <p className="truncate text-xs text-slate-500">{item.shift.name} · {item.shift.startTime}–{item.shift.endTime}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.classes}`}>
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="Belum ada shift" description="Atur penugasan shift untuk mempercepat operasi harian." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Grafik Bulanan</CardTitle>
            <Badge variant="info">Monthly</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex h-[280px] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 text-center dark:border-slate-800 dark:bg-slate-900/70">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Grafik bulanan siap terisi</p>
                <p className="mt-1 text-sm text-slate-500">Data akan muncul otomatis setelah absensi terkumpul.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
