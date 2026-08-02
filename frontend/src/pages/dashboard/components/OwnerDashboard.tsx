import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Clock3,
  Coffee,
  RefreshCw,
  Store,
  TrendingUp,
  Users
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, Button, EmptyState } from '@/components/ui/design-system';

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
  todayShifts: Array<{
    employeeId: string;
    employeeName: string;
    position: string | null;
    employeePhotoUrl: string | null;
    shift: { name: string; startTime: string; endTime: string };
    status: 'WORKING' | 'PENDING' | 'COMPLETED' | 'ABSENT';
  }>;
};

const shortDayFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  weekday: 'short'
});

const timeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

export default function OwnerDashboard() {
  const summaryQuery = useQuery<DashboardSummary>({
    queryKey: ['owner-dashboard-summary'],
    queryFn: async () => (await api.get('/dashboard/summary')).data,
    refetchInterval: 60_000
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
          <h2 className="font-semibold text-slate-900 dark:text-white">Gagal memuat data dashboard executive</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Terjadi masalah saat mengambil data real dari server. Silakan coba lagi.
          </p>
          <Button onClick={() => summaryQuery.refetch()} className="mt-4 gap-2">
            <RefreshCw className="h-4 w-4" /> Coba Muat Ulang
          </Button>
        </CardContent>
      </Card>
    );
  }

  const summary = summaryQuery.data;
  const stats = summary.stats;

  const attendanceRate = stats.totalEmployees > 0
    ? Math.round((stats.presentToday / stats.totalEmployees) * 100)
    : 0;

  const trendData = summary.weeklyTrend.map((item) => ({
    ...item,
    label: shortDayFormatter.format(new Date(`${item.date}T12:00:00+07:00`))
  }));

  return (
    <div className="space-y-6">
      {/* Executive Real Data Header */}
      <section className="relative overflow-hidden rounded-[20px] sm:rounded-[28px] border border-amber-500/20 bg-gradient-to-br from-[#fffdfa] via-[#fdf6ec] to-[#f5ebdc] p-3.5 sm:p-5 lg:p-7 shadow-sm dark:border-[#3e2e24] dark:from-[#241a13] dark:via-[#1e1510] dark:to-[#17100b]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
              <Store className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="truncate">Executive Analytics · Real Live Data</span>
            </div>
            <h2 className="mt-2 text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-tight leading-snug text-slate-900 dark:text-amber-50">
              Analisa Operasional Real-Time Kopi Selon
            </h2>
            <p className="mt-1 text-xs sm:text-sm font-medium leading-relaxed text-slate-600 dark:text-amber-200/80">
              Data aktual bersumber dari database presensi karyawan dan jadwal shift resmi.
            </p>
          </div>
          <Badge variant="success" className="w-fit px-2.5 py-1 text-[11px] font-bold">
            🟢 Live Data Terhubung
          </Badge>
        </div>
      </section>

      {/* Real KPI Metrics */}
      <section className="grid gap-3.5 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: 'Tingkat Kehadiran Hari Ini', value: `${attendanceRate}%`, caption: `${stats.presentToday} dari ${stats.totalEmployees} karyawan`, icon: TrendingUp },
          { title: 'Total Karyawan Aktif', value: `${stats.totalEmployees}`, caption: 'Terdaftar di sistem DB', icon: Users },
          { title: 'Sedang Bekerja (Active)', value: `${stats.currentlyWorking}`, caption: 'Clock-in di outlet', icon: Coffee },
          { title: 'Terlambat Hari Ini', value: `${stats.lateToday}`, caption: 'Perlu tinjauan supervisor', icon: Clock3 }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="rounded-[20px] sm:rounded-[24px] border border-amber-500/15 bg-white/90 p-4 sm:p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 dark:border-[#3a2b20] dark:bg-[#221812]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-amber-400/80 leading-snug">{stat.title}</p>
                  <p className="mt-1.5 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-none text-slate-900 dark:text-amber-50">{stat.value}</p>
                  <p className="mt-1.5 text-xs font-medium leading-normal text-amber-700 dark:text-amber-300/80 truncate">{stat.caption}</p>
                </div>
                <span className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Real Weekly Trend Chart & Active Floor Roster */}
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-amber-500/20 bg-white dark:border-[#3a2b20] dark:bg-[#221812]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-amber-100">Tren Kehadiran Mingguan (Real Data)</CardTitle>
              <p className="mt-1 text-xs text-slate-500 dark:text-amber-300/60">Grafik 7 hari terakhir dari database</p>
            </div>
            <Badge variant="info">Real API</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="realOwnerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D97706" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(217,119,6,0.15)" />
                  <XAxis dataKey="label" stroke="#a38068" tickLine={false} />
                  <YAxis stroke="#a38068" tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1b130e',
                      borderColor: '#3e2e24',
                      borderRadius: '12px',
                      color: '#fdfbf7'
                    }}
                  />
                  <Area type="monotone" dataKey="present" name="Hadir" stroke="#F59E0B" strokeWidth={3} fill="url(#realOwnerGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Real Active Staff Roster */}
        <Card className="border-amber-500/20 bg-white dark:border-[#3a2b20] dark:bg-[#221812]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-amber-100">Staf Bekerja Hari Ini</CardTitle>
              <p className="mt-1 text-xs text-slate-500 dark:text-amber-300/60">Daftar penugasan shift real hari ini</p>
            </div>
            <Badge variant="neutral">{summary.todayShifts.length} Penugasan</Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {summary.todayShifts.length ? (
              summary.todayShifts.slice(0, 5).map((item) => (
                <div key={item.employeeId} className="flex items-center justify-between rounded-2xl border border-amber-500/15 bg-amber-500/5 p-3.5 dark:border-amber-900/30 dark:bg-amber-950/20">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-slate-900 dark:text-amber-100">{item.employeeName}</p>
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-900 dark:bg-amber-500/30 dark:text-amber-200">
                        {(item as any).outletCode || (item as any).outlet?.code || 'SELON-1'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-amber-300/70">{item.position || 'Karyawan'} · {item.shift.name} ({item.shift.startTime} - {item.shift.endTime})</p>
                  </div>
                  <Badge variant={item.status === 'WORKING' ? 'success' : item.status === 'COMPLETED' ? 'info' : item.status === 'ABSENT' ? 'danger' : 'neutral'}>
                    {item.status}
                  </Badge>
                </div>
              ))
            ) : (
              <EmptyState title="Belum ada penugasan shift" description="Jadwal shift untuk hari ini belum diatur." />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Real Activity Stream */}
      <Card className="border-amber-500/20 bg-white dark:border-[#3a2b20] dark:bg-[#221812]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-amber-100">Aktivitas Presensi Terakhir (Real-Time Log)</CardTitle>
            <p className="mt-1 text-xs text-slate-500 dark:text-amber-300/60">Catatan masuk/pulang karyawan terkini</p>
          </div>
          <Badge variant="success">Live Log</Badge>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {summary.recentActivity.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {summary.recentActivity.map((act) => (
                <div key={act.id} className="flex items-center gap-3 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-3.5 dark:border-amber-900/30 dark:bg-amber-950/20">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 font-bold text-amber-800 dark:text-amber-200">
                    {act.employeeName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-amber-100">{act.employeeName}</p>
                    <p className="text-xs text-slate-500 dark:text-amber-300/70">{act.action === 'CHECK_IN' ? 'Masuk' : 'Pulang'} · {timeFormatter.format(new Date(act.timestamp))}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Belum ada aktivitas presensi" description="Belum ada catatan presensi karyawan yang terekam hari ini." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
