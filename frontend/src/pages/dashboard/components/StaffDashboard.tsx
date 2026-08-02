import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
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
import { cn } from '@/lib/utils';
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

  // activeTabPerOutlet: masing-masing kartu outlet punya state tab sendiri
  const [activeTabPerOutlet, setActiveTabPerOutlet] = useState<Record<string, 'today' | 'tomorrow' | 'lusa'>>({});
  const getTab = (outletId: string) => activeTabPerOutlet[outletId] ?? 'today';
  const setTab = (outletId: string, tab: 'today' | 'tomorrow' | 'lusa') =>
    setActiveTabPerOutlet((prev) => ({ ...prev, [outletId]: tab }));

  const rosterQuery = useQuery({
    queryKey: ['staff-dashboard-3day-roster'],
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
    refetchInterval: 30_000
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
          const normalizeCode = (s: string) => s.toUpperCase().replace(/[\s_-]+/g, '');
          const isIdMatch   = activeOutletId && activeOutletId === outletItem.id;
          const isCodeMatch = !isIdMatch && activeOutlet?.code && outletItem.code &&
            normalizeCode(activeOutlet.code) === normalizeCode(outletItem.code);
          const isUnassigned = !activeOutletId && !activeOutlet?.code;
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
                
                {/* Elegant Tabs */}
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
