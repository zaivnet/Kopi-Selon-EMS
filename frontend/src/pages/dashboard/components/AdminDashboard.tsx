import { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Coffee,
  FileBarChart2,
  FileText,
  LogIn,
  LogOut,
  PlusCircle,
  RefreshCw,
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
import { cn } from '@/lib/utils';
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
  const navigate = useNavigate();
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

  // activeTabPerOutlet: masing-masing kartu outlet punya state tab sendiri (Hari Ini/Besok/Lusa)
  const [activeTabPerOutlet, setActiveTabPerOutlet] = useState<Record<string, 'today' | 'tomorrow' | 'lusa'>>({});
  const getTab = (outletId: string) => activeTabPerOutlet[outletId] ?? 'today';
  const setTab = (outletId: string, tab: 'today' | 'tomorrow' | 'lusa') =>
    setActiveTabPerOutlet((prev) => ({ ...prev, [outletId]: tab }));

  const rosterQuery = useQuery({
    queryKey: ['admin-dashboard-3day-roster'],
    queryFn: async () => {
      const todayObj = new Date();
      const startStr = dayjs(todayObj).format('YYYY-MM-DD');
      const endStr = dayjs(todayObj).add(3, 'day').format('YYYY-MM-DD');

      const [empRes, shiftRes, schRes, outletRes] = await Promise.all([
        api.get('/employees').catch(() => ({ data: [] })),
        api.get('/shifts').catch(() => ({ data: [] })),
        api.get(`/shifts/schedules?startDate=${startStr}&endDate=${endStr}`).catch(() => ({ data: [] })),
        api.get('/outlets').catch(() => ({ data: [] }))
      ]);

      const fetchedOutlets = Array.isArray(outletRes.data) && outletRes.data.length > 0 ? outletRes.data : [];
      const outlets = fetchedOutlets.length > 0 ? fetchedOutlets : [
        { id: 'selon-1', code: 'SELON 1', name: 'SELON 1' },
        { id: 'selon-2', code: 'SELON 2', name: 'SELON 2' }
      ];

      return {
        employees: Array.isArray(empRes.data) ? empRes.data : [],
        shifts: Array.isArray(shiftRes.data) ? shiftRes.data : [],
        schedules: Array.isArray(schRes.data) ? schRes.data : [],
        outlets
      };
    },
    refetchInterval: 60_000
  });

  const threeDaysDataByOutlet = useMemo(() => {
    if (!rosterQuery.data) return [];
    const { employees, shifts, schedules, outlets } = rosterQuery.data;

    const baseToday = dayjs();
    const days = [
      { key: 'today' as const, label: 'Hari Ini', date: baseToday },
      { key: 'tomorrow' as const, label: 'Besok', date: baseToday.add(1, 'day') },
      { key: 'lusa' as const, label: 'Lusa', date: baseToday.add(2, 'day') }
    ];

    const workerEmployees = employees.filter((emp: any) => {
      const roleName = emp.user?.role?.name;
      return !roleName || roleName === 'Karyawan';
    });

    const activeOutlets = Array.isArray(outlets) && outlets.length > 0
      ? outlets
      : [
          { id: 'selon-1', code: 'SELON 1', name: 'SELON 1' },
          { id: 'selon-2', code: 'SELON 2', name: 'SELON 2' }
        ];

    return activeOutlets.map((outletItem: any) => {
      const daysData: Record<'today' | 'tomorrow' | 'lusa', any> = {
        today: null,
        tomorrow: null,
        lusa: null
      };

      days.forEach((d) => {
        const targetDateStr = d.date.format('YYYY-MM-DD');
        const targetTime = d.date.toDate().getTime();

        const shiftGroups: Record<string, any[]> = {};
        shifts.forEach((s: any) => {
          shiftGroups[s.id] = [];
        });
        shiftGroups['OFF'] = [];

        workerEmployees.forEach((emp: any) => {
          const empSchedules = Array.isArray(emp.workSchedules) ? emp.workSchedules : [];
          const matchSchedule =
            schedules.find((sch: any) => sch.employeeId === emp.id && dayjs(sch.date).format('YYYY-MM-DD') === targetDateStr) ||
            empSchedules.find((sch: any) => dayjs(sch.date).format('YYYY-MM-DD') === targetDateStr);

          const activeOutlet = matchSchedule?.outlet || emp.outlet;
          const activeOutletId = activeOutlet?.id ?? null;

          // ── Logika matching outlet yang robust ───────────────────────────
          // Prioritas: match by ID → match by code (normalize) → unassigned
          // Karyawan tanpa outlet hanya masuk jika ini satu-satunya outlet,
          // atau jika outlet pertama (index 0) di daftar.
          const normalizeCode = (s: string) => s.toUpperCase().replace(/[\s_-]+/g, '');
          const isIdMatch   = activeOutletId && activeOutletId === outletItem.id;
          const isCodeMatch = !isIdMatch && activeOutlet?.code && outletItem.code &&
            normalizeCode(activeOutlet.code) === normalizeCode(outletItem.code);
          const isUnassigned = !activeOutletId && !activeOutlet?.code;
          // Karyawan unassigned masuk ke outlet pertama saja (index 0)
          const isUnassignedFallback = isUnassigned && activeOutlets.indexOf(outletItem) === 0;

          const isMatch = !!(isIdMatch || isCodeMatch || isUnassignedFallback);

          if (!isMatch && activeOutlets.length > 1) {
            return;
          }

          let leaveTag = null;
          if (Array.isArray(emp.leaves)) {
            const matchLeave = emp.leaves.find((l: any) => {
              if (!l.startDate) return false;
              const sTime = new Date(l.startDate).setHours(0, 0, 0, 0);
              const eTime = l.endDate ? new Date(l.endDate).setHours(23, 59, 59, 999) : sTime;
              return targetTime >= sTime && targetTime <= eTime;
            });
            if (matchLeave) {
              leaveTag = matchLeave.type === 'SICK' ? 'Sakit' : 'Cuti';
            }
          }

          if (!leaveTag && Array.isArray(emp.permissions)) {
            const matchPerm = emp.permissions.find((p: any) => {
              if (!p.date) return false;
              return dayjs(p.date).format('YYYY-MM-DD') === targetDateStr;
            });
            if (matchPerm) {
              leaveTag = 'Izin';
            }
          }

          const memberData = {
            ...emp,
            outletCode: activeOutlet?.code ?? '',
            outletName: activeOutlet?.name || outletItem.name
          };

          if (leaveTag) {
            shiftGroups['OFF'].push({ ...memberData, statusTag: leaveTag });
            return;
          }

          if (matchSchedule) {
            if (matchSchedule.shiftId && matchSchedule.shiftId !== 'OFF' && shiftGroups[matchSchedule.shiftId]) {
              shiftGroups[matchSchedule.shiftId].push(memberData);
            } else {
              shiftGroups['OFF'].push({ ...memberData, statusTag: 'Libur (OFF)' });
            }
            return;
          }

          if (emp.shiftId && shiftGroups[emp.shiftId]) {
            shiftGroups[emp.shiftId].push(memberData);
          } else if (emp.shift?.id && shiftGroups[emp.shift.id]) {
            shiftGroups[emp.shift.id].push(memberData);
          } else {
            shiftGroups['OFF'].push({ ...memberData, statusTag: 'Libur (OFF)' });
          }
        });

        const shiftList = shifts.map((s: any) => ({
          shiftId: s.id,
          shiftName: s.name,
          shiftTime: `${s.startTime} - ${s.endTime}`,
          members: shiftGroups[s.id] || []
        }));

        daysData[d.key] = {
          formattedDate: d.date.format('dddd, D MMMM YYYY'),
          shifts: shiftList
        };
      });

      const displayTitle = outletItem.code 
        ? `Jadwal Shift ${outletItem.code.includes('SELON') ? outletItem.code : `SELON ${outletItem.code}`}`
        : `Jadwal Shift ${outletItem.name}`;

      return {
        outlet: outletItem,
        title: displayTitle,
        days: daysData
      };
    });
  }, [rosterQuery.data]);

  const pendingRequestsQuery = useQuery({
    queryKey: ['admin-dashboard-pending-requests'],
    queryFn: async () => {
      const res = await api.get('/requests?status=Pending');
      return Array.isArray(res.data) ? res.data : [];
    },
    refetchInterval: 30_000
  });

  const companyQuery = useQuery({
    queryKey: ['admin-dashboard-company'],
    queryFn: async () => {
      const res = await api.get('/company');
      return res.data || null;
    },
    refetchInterval: 60_000
  });

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
              <Button size="md" onClick={() => navigate('/dashboard/employees')}>Tambah Karyawan</Button>
              <Button variant="secondary" size="md" onClick={() => navigate('/dashboard/attendance-monitoring')}>Lihat Absensi</Button>
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

        {/* Real Persetujuan Request Center */}
        <Card className="border-amber-500/20 bg-white dark:border-[#3a2b20] dark:bg-[#221812]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
              <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Persetujuan Request Center
            </CardTitle>
            <Badge variant="warning">{pendingRequestsQuery.data?.length || 0} Pending</Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-2 max-h-[300px] overflow-y-auto scrollbar-thin">
            {pendingRequestsQuery.isLoading ? (
              <div className="space-y-2">
                {[0, 1].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-amber-500/5 dark:bg-[#1f1611]/80" />
                ))}
              </div>
            ) : pendingRequestsQuery.data?.length ? (
              pendingRequestsQuery.data.slice(0, 3).map((req: any) => (
                <div
                  key={req.id}
                  onClick={() => navigate('/dashboard/requests')}
                  className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-3.5 cursor-pointer hover:bg-amber-500/10 transition-colors dark:border-amber-900/30 dark:bg-amber-950/20"
                >
                  <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-amber-100">
                    {req.employee?.firstName} {req.employee?.lastName || ''}
                  </p>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/70">
                    {req.type === 'LEAVE' ? 'Cuti' : req.type === 'SICK_LEAVE' ? 'Sakit' : req.type === 'SWAP_SHIFT' ? 'Tukar Shift' : req.type === 'OVERTIME' ? 'Lembur' : 'Izin'} · {dayjs(req.startDate).format('D MMM YYYY')}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState title="Semua request bersih" description="Tidak ada pengajuan cuti/izin yang perlu disetujui saat ini." />
            )}
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
              { label: 'Tambah Karyawan', icon: UserPlus, description: 'Buat akun baru', path: '/dashboard/employees' },
              { label: 'Tambah Shift', icon: PlusCircle, description: 'Atur jadwal', path: '/dashboard/shifts' },
              { label: 'Lihat Absensi', icon: FileBarChart2, description: 'Pantau harian', path: '/dashboard/attendance-monitoring' },
              { label: 'Laporan', icon: Warehouse, description: 'Ekspor data', path: '/dashboard/reports' }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 w-full"
                >
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

          <Card className="border-amber-500/20 bg-white dark:border-[#3a2b20] dark:bg-[#221812]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                <Warehouse className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Informasi Outlet
              </CardTitle>
              <Badge variant="neutral">Kopi Selon</Badge>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {companyQuery.isLoading ? (
                <div className="space-y-2">
                  <div className="h-10 animate-pulse rounded-xl bg-amber-500/5 dark:bg-[#1f1611]/80" />
                  <div className="h-10 animate-pulse rounded-xl bg-amber-500/5 dark:bg-[#1f1611]/80" />
                </div>
              ) : companyQuery.data ? (
                <div className="space-y-2.5 text-xs">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                    <p className="font-bold text-slate-700 dark:text-amber-100">Nama Outlet</p>
                    <p className="text-slate-500 dark:text-slate-400">{companyQuery.data.name || '-'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                    <p className="font-bold text-slate-700 dark:text-amber-100">Alamat</p>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{companyQuery.data.address || '-'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                    <p className="font-bold text-slate-700 dark:text-amber-100">Kontak</p>
                    <p className="text-slate-500 dark:text-slate-400">{companyQuery.data.phone || '-'} · {companyQuery.data.email || '-'}</p>
                  </div>
                </div>
              ) : (
                <EmptyState title="Profil belum diatur" description="Silakan atur profil perusahaan di menu Profil Perusahaan." />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {rosterQuery.isLoading ? (
          <Card className="border-amber-500/20 bg-white dark:border-[#3a2b20] dark:bg-[#221812]">
            <CardContent className="p-6 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-amber-500/5 dark:bg-amber-950/20" />
              ))}
            </CardContent>
          </Card>
        ) : (
          threeDaysDataByOutlet.map((outletRoster: any) => (
            <Card key={outletRoster.outlet.id} className="border-amber-500/20 bg-white dark:border-[#3a2b20] dark:bg-[#221812]">
              <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between pb-2 gap-2">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-amber-100">{outletRoster.title}</CardTitle>
                  <p className="mt-1 text-xs text-slate-500 dark:text-amber-300/60">Hari Ini, Besok & Lusa (khusus Karyawan)</p>
                </div>
                
                {/* Tabs per kartu outlet — tidak lagi global */}
                <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 shrink-0">
                  {(['today', 'tomorrow', 'lusa'] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(outletRoster.outlet.id, key)}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                        getTab(outletRoster.outlet.id) === key
                          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-amber-100'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                      )}
                    >
                      {key === 'today' ? 'Hari Ini' : key === 'tomorrow' ? 'Besok' : 'Lusa'}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-2 max-h-[380px] overflow-y-auto scrollbar-thin">
                {outletRoster.days[getTab(outletRoster.outlet.id)] ? (
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                      🗓️ {outletRoster.days[getTab(outletRoster.outlet.id)].formattedDate}
                    </p>
                    {outletRoster.days[getTab(outletRoster.outlet.id)].shifts.map((group: any) => (
                      <div
                        key={group.shiftId}
                        className={cn(
                          'rounded-xl p-3 border text-xs',
                          group.shiftId === 'OFF'
                            ? 'bg-slate-50 border-slate-200/70 dark:bg-slate-900/50 dark:border-slate-800'
                            : 'bg-amber-500/5 border-amber-500/15 dark:bg-amber-950/30 dark:border-amber-900/40'
                        )}
                      >
                        <div className="flex items-center justify-between font-bold text-slate-800 dark:text-amber-100 pb-1.5 border-b border-slate-200/60 dark:border-slate-800">
                          <span>{group.shiftName}</span>
                          <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 shrink-0 ml-1">
                            {group.shiftTime} ({group.members.length})
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {group.members.length === 0 ? (
                            <span className="text-[10px] italic text-slate-400">Tidak ada penugasan</span>
                          ) : (
                            group.members.map((m: any) => (
                              <span
                                key={m.id}
                                className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 shadow-sm border border-slate-200/70 dark:bg-slate-800 dark:text-amber-100 dark:border-slate-700"
                              >
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-[9px] font-bold text-amber-900 dark:text-amber-200">
                                  {m.firstName.charAt(0)}
                                </span>
                                <span>{m.firstName} {m.lastName || ''}</span>
                                {m.statusTag && (
                                  <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400">
                                    ({m.statusTag})
                                  </span>
                                )}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="Belum ada penugasan" description="Jadwal untuk hari ini belum diatur." />
                )}
              </CardContent>
            </Card>
          ))
        )}

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
