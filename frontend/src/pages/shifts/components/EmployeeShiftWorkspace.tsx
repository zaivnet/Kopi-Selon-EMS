import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import dayjs from 'dayjs';
import {
  CalendarClock,
  Clock,
  ArrowLeftRight,
  CalendarCheck,
  Calendar as CalendarIcon,
  FileText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  Sparkles,
  TrendingUp,
  X,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/design-system';
import EmployeeRequestDrawer, { RequestDrawerType } from '@/components/requests/EmployeeRequestDrawer';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface EmployeeShiftWorkspaceProps {
  user: any;
}

export default function EmployeeShiftWorkspace({ user }: EmployeeShiftWorkspaceProps) {
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [myAttendances, setMyAttendances] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [pendingPeerSwaps, setPendingPeerSwaps] = useState<any[]>([]);
  const [peerToastMessage, setPeerToastMessage] = useState<string | null>(null);
  const [isRequestDrawerOpen, setIsRequestDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<RequestDrawerType>('PERMISSION');

  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [allShifts, setAllShifts] = useState<any[]>([]);
  const [teamSchedules, setTeamSchedules] = useState<any[]>([]);
  const [selectedRosterDayIndex, setSelectedRosterDayIndex] = useState<number>(0);
  const [rosterSearchQuery, setRosterSearchQuery] = useState<string>('');

  const openDrawer = (type: RequestDrawerType) => {
    setDrawerType(type);
    setIsRequestDrawerOpen(true);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Get logged-in employee's profile with work schedule and shift info
      try {
        const empRes = await api.get('/employees/me');
        setEmployeeData(empRes.data || null);
      } catch {
        setEmployeeData(user?.employee || null);
      }

      // 2. Get personal attendances
      try {
        const attRes = await api.get('/attendance/me');
        setMyAttendances(Array.isArray(attRes.data) ? attRes.data : []);
      } catch {
        setMyAttendances([]);
      }

      // 3. Get pending peer swap requests targeting this employee
      try {
        const reqRes = await api.get('/requests?type=SWAP_SHIFT&status=Waiting Employee Approval');
        setPendingPeerSwaps(Array.isArray(reqRes.data) ? reqRes.data : []);
      } catch {
        setPendingPeerSwaps([]);
      }

      // 4. Fetch all employees & shifts for Team Roster view
      try {
        const [empRes, shiftRes] = await Promise.all([
          api.get('/employees'),
          api.get('/shifts')
        ]);
        setAllEmployees(Array.isArray(empRes.data) ? empRes.data : []);
        setAllShifts(Array.isArray(shiftRes.data) ? shiftRes.data : []);
      } catch {
        setAllEmployees([]);
        setAllShifts([]);
      }

      // 5. Fetch 7-day team WorkSchedules from Roster Matrix
      try {
        const todayObj = new Date();
        const startStr = dayjs(todayObj).format('YYYY-MM-DD');
        const endStr = dayjs(todayObj).add(7, 'day').format('YYYY-MM-DD');
        const schRes = await api.get(`/shifts/schedules?startDate=${startStr}&endDate=${endStr}`);
        setTeamSchedules(Array.isArray(schRes.data) ? schRes.data : []);
      } catch {
        setTeamSchedules([]);
      }
    } catch (err) {
      console.error('Error loading employee workspace data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleRespondPeerSwap = async (requestId: string, action: 'ACCEPT' | 'REJECT') => {
    try {
      const res = await api.post(`/requests/${requestId}/peer-respond`, { action });
      setPeerToastMessage(res.data?.message || `Permintaan tukar shift berhasil ${action === 'ACCEPT' ? 'disetujui' : 'ditolak'}.`);
      setTimeout(() => setPeerToastMessage(null), 3500);
      await fetchData();
    } catch (err: any) {
      setPeerToastMessage(`Gagal merespon: ${err.response?.data?.message || err.message}`);
      setTimeout(() => setPeerToastMessage(null), 3500);
    }
  };

  // Helper: Resolve effective shift or status for a specific date (reads Leaves, Permissions, WorkSchedule or fallback to default employee.shift)
  const getEffectiveShiftForDate = (targetDate: Date, emp: any): (Shift & { isSpecial?: boolean; specialType?: string }) | null => {
    if (!emp) return null;

    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();
    const checkTime = targetDate.getTime();

    // 1. Check for Approved Leaves (Cuti / Sakit)
    if (Array.isArray(emp.leaves) && emp.leaves.length > 0) {
      const matchLeave = emp.leaves.find((l: any) => {
        if (!l.startDate) return false;
        const start = new Date(l.startDate);
        const end = l.endDate ? new Date(l.endDate) : start;
        const sTime = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0).getTime();
        const eTime = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).getTime();
        return checkTime >= sTime && checkTime <= eTime;
      });

      if (matchLeave) {
        const isSick = matchLeave.type === 'SICK';
        return {
          id: matchLeave.id,
          name: isSick ? 'Izin Sakit' : 'Cuti Resmi',
          startTime: 'Off',
          endTime: 'Off',
          isSpecial: true,
          specialType: isSick ? 'SICK' : 'LEAVE',
        };
      }
    }

    // 2. Check for Approved Permissions (Izin / Tidak Masuk)
    if (Array.isArray(emp.permissions) && emp.permissions.length > 0) {
      const matchPerm = emp.permissions.find((p: any) => {
        if (!p.date) return false;
        const d = new Date(p.date);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
      });

      if (matchPerm) {
        return {
          id: matchPerm.id,
          name: 'Izin',
          startTime: 'Off',
          endTime: 'Off',
          isSpecial: true,
          specialType: 'PERMISSION',
        };
      }
    }

    // 3. Check for Custom WorkSchedule (Ganti Shift / Tukar Shift)
    if (Array.isArray(emp.workSchedules) && emp.workSchedules.length > 0) {
      const matchSchedule = emp.workSchedules.find((ws: any) => {
        if (!ws.date) return false;
        const d = new Date(ws.date);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
      });

      if (matchSchedule && matchSchedule.shift) {
        return matchSchedule.shift;
      }
    }

    // 4. Default Base Shift
    if (emp.shift) {
      return emp.shift;
    }

    return null;
  };

  // Generate 7 days items starting from today for Team Roster
  const roster7Days = React.useMemo(() => {
    const days = [];
    const baseToday = dayjs();
    for (let i = 0; i < 7; i++) {
      const d = baseToday.add(i, 'day');
      days.push({
        index: i,
        dateObj: d.toDate(),
        dateStr: d.format('YYYY-MM-DD'),
        label: i === 0 ? 'Hari Ini' : i === 1 ? 'Besok' : d.format('dddd'),
        formattedDate: d.format('DD MMM'),
        isToday: i === 0
      });
    }
    return days;
  }, []);

  // Compute team shift assignments for the selected roster day
  const selectedDayShifts = React.useMemo(() => {
    const selectedDay = roster7Days[selectedRosterDayIndex] || roster7Days[0];
    if (!selectedDay) return [];

    const targetDateStr = selectedDay.dateStr;
    const targetDateObj = selectedDay.dateObj;
    const targetTime = targetDateObj.getTime();

    // Filter active worker employees (Karyawan & Staff)
    const filteredEmps = allEmployees.filter((emp) => {
      const roleName = emp.user?.role?.name;
      const isWorker = !roleName || roleName === 'Karyawan';
      if (!isWorker) return false;

      if (!rosterSearchQuery.trim()) return true;
      const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
      return fullName.includes(rosterSearchQuery.toLowerCase().trim());
    });

    // Group members by shiftId
    const shiftGroups: Record<string, any[]> = {};
    allShifts.forEach((s) => {
      shiftGroups[s.id] = [];
    });
    shiftGroups['OFF'] = [];

    filteredEmps.forEach((emp) => {
      let leaveTag = null;

      // 1. Approved Leaves
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

      // 2. Approved Permissions
      if (!leaveTag && Array.isArray(emp.permissions)) {
        const matchPerm = emp.permissions.find((p: any) => {
          if (!p.date) return false;
          return dayjs(p.date).format('YYYY-MM-DD') === targetDateStr;
        });
        if (matchPerm) {
          leaveTag = 'Izin';
        }
      }

      if (leaveTag) {
        shiftGroups['OFF'].push({ ...emp, statusTag: leaveTag });
        return;
      }

      // 3. WorkSchedule entry from Roster Matrix
      const matchSchedule = teamSchedules.find((sch: any) => {
        return sch.employeeId === emp.id && dayjs(sch.date).format('YYYY-MM-DD') === targetDateStr;
      });

      if (matchSchedule) {
        if (matchSchedule.shiftId && matchSchedule.shiftId !== 'OFF' && shiftGroups[matchSchedule.shiftId]) {
          shiftGroups[matchSchedule.shiftId].push(emp);
        } else {
          shiftGroups['OFF'].push({ ...emp, statusTag: 'Libur (OFF)' });
        }
        return;
      }

      // 4. Default Base Shift fallback
      if (emp.shiftId && shiftGroups[emp.shiftId]) {
        shiftGroups[emp.shiftId].push(emp);
      } else if (emp.shift?.id && shiftGroups[emp.shift.id]) {
        shiftGroups[emp.shift.id].push(emp);
      } else {
        shiftGroups['OFF'].push({ ...emp, statusTag: 'Libur (OFF)' });
      }
    });

    const result = allShifts.map((s) => ({
      shiftId: s.id,
      shiftName: s.name,
      shiftTime: `${s.startTime} - ${s.endTime} WIB`,
      isOff: false,
      members: shiftGroups[s.id] || []
    }));

    result.push({
      shiftId: 'OFF',
      shiftName: '⛔ Libur / Cuti (OFF)',
      shiftTime: 'Tidak Bertugas',
      isOff: true,
      members: shiftGroups['OFF'] || []
    });

    return result;
  }, [allEmployees, allShifts, teamSchedules, roster7Days, selectedRosterDayIndex, rosterSearchQuery]);

  const today = new Date();
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayName = dayNames[today.getDay()];

  // Today's & Tomorrow's effective shifts
  const todayShift = getEffectiveShiftForDate(today, employeeData);
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const tomorrowShift = getEffectiveShiftForDate(tomorrow, employeeData);

  // Calculate stats
  const totalAttendances = myAttendances.length;
  const presentCount = myAttendances.filter((a) => a.status === 'PRESENT').length;
  const lateCount = myAttendances.filter((a) => a.status === 'LATE').length;
  const leaveCount = myAttendances.filter((a) => a.status === 'HALFDAY' || a.status === 'ABSENT').length;

  // Calendar logic for personal calendar view
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Generate 7-day week schedule (Mon-Sun) without mutating date objects
  const getWeeklySchedule = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + distanceToMonday);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const dayName = dayNames[d.getDay()];
      const isToday = d.toDateString() === now.toDateString();
      const effShift = getEffectiveShiftForDate(d, employeeData);

      week.push({
        date: d,
        dayName,
        dateNum: d.getDate(),
        isToday,
        shiftName: effShift ? effShift.name : 'Libur / Off',
        shiftTime: effShift ? `${effShift.startTime} - ${effShift.endTime}` : 'Off',
      });
    }
    return week;
  };

  const weeklyDays = getWeeklySchedule();

  const formatDateSafe = (dateVal: any) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  const formatTimeSafe = (timeVal: any) => {
    if (!timeVal) return '-';
    try {
      const d = new Date(timeVal);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#6F4E37] via-[#8B5A2B] to-[#C89B6D] p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-3 py-1 text-xs font-medium tracking-wider backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-200" /> PERSONAL WORKSPACE
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Jadwal Kerja Saya</h1>
            <p className="mt-1 text-sm text-amber-100/90 max-w-xl">
              Halo, <span className="font-semibold text-white">{employeeData ? `${employeeData.firstName} ${employeeData.lastName || ''}` : user?.username}</span>! Pantau jadwal harian, statistik jam kerja, dan buat pengajuan izin dengan mudah.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold backdrop-blur-md">
              <Clock className="h-7 w-7 text-amber-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Peer Toast Alert */}
      {peerToastMessage && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-950/90 text-emerald-100 px-5 py-3.5 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <p className="text-sm font-semibold">{peerToastMessage}</p>
          </div>
          <button onClick={() => setPeerToastMessage(null)} className="rounded-lg p-1 hover:bg-emerald-900/50">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* PROMINENT PEER SWAP APPROVAL BANNER */}
      {pendingPeerSwaps.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 p-6 shadow-xl backdrop-blur-xl animate-pulse">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                <ArrowLeftRight className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-600 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    Permintaan Tukar Shift Rekan Kerja
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-800 dark:text-amber-300">
                    {pendingPeerSwaps[0].requestNumber}
                  </span>
                </div>
                <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-amber-100">
                  {pendingPeerSwaps[0].employee?.firstName} {pendingPeerSwaps[0].employee?.lastName || ''} mengajukan Tukar Shift dengan Anda
                </h3>
                <p className="mt-0.5 text-xs text-slate-700 dark:text-amber-200/90 leading-relaxed">
                  Tanggal Pengajuan: <strong className="font-bold text-amber-900 dark:text-amber-100">{formatDateSafe(pendingPeerSwaps[0].startDate)}</strong> · Alasan: &quot;{pendingPeerSwaps[0].reason || 'Tukar shift kerja'}&quot;
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleRespondPeerSwap(pendingPeerSwaps[0].id, 'REJECT')}
                className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300"
              >
                <X className="h-4 w-4 mr-1" /> Tolak
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={() => handleRespondPeerSwap(pendingPeerSwaps[0].id, 'ACCEPT')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 font-bold"
              >
                <Check className="h-4 w-4 mr-1" /> Setujui Tukar Shift
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ACTIONS PANEL */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Aksi Cepat Pengajuan
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => openDrawer('SWAP_SHIFT')}
            className="flex items-center gap-3 rounded-2xl border border-purple-200/80 bg-purple-50/50 p-3.5 text-left transition hover:-translate-y-0.5 hover:bg-purple-100/60 dark:border-purple-900/40 dark:bg-purple-950/20 dark:hover:bg-purple-900/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Ajukan Tukar Shift</p>
              <p className="text-[11px] text-slate-500">Tukar dengan rekan</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openDrawer('CHANGE_SHIFT')}
            className="flex items-center gap-3 rounded-2xl border border-blue-200/80 bg-blue-50/50 p-3.5 text-left transition hover:-translate-y-0.5 hover:bg-blue-100/60 dark:border-blue-900/40 dark:bg-blue-950/20 dark:hover:bg-blue-900/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Ajukan Ganti Shift</p>
              <p className="text-[11px] text-slate-500">Pindah jam kerja</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openDrawer('LEAVE')}
            className="flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 text-left transition hover:-translate-y-0.5 hover:bg-emerald-100/60 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Ajukan Cuti</p>
              <p className="text-[11px] text-slate-500">Cuti tahunan</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openDrawer('PERMISSION')}
            className="flex items-center gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/50 p-3.5 text-left transition hover:-translate-y-0.5 hover:bg-amber-100/60 dark:border-amber-900/40 dark:bg-amber-950/20 dark:hover:bg-amber-900/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Ajukan Izin</p>
              <p className="text-[11px] text-slate-500">Sakit / Terlambat</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openDrawer('OVERTIME')}
            className="flex items-center gap-3 rounded-2xl border border-orange-200/80 bg-orange-50/50 p-3.5 text-left transition hover:-translate-y-0.5 hover:bg-orange-100/60 dark:border-orange-900/40 dark:bg-orange-950/20 dark:hover:bg-orange-900/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-md">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Ajukan Lembur</p>
              <p className="text-[11px] text-slate-500">Minta jam lembur</p>
            </div>
          </button>
        </div>
      </div>

      {/* 1 & 2: SHIFT HARI INI & SHIFT BERIKUTNYA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Shift Hari Ini */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6F4E37] text-white">
                <CalendarClock className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">1. Shift Hari Ini</h2>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              {todayName}, {today.getDate()} {monthNames[today.getMonth()]}
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {todayShift ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Nama Shift Official</p>
                    <p className="text-2xl font-black text-[#6F4E37] dark:text-amber-300 mt-0.5">
                      {todayShift.name}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" /> Shift Aktif
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100 dark:bg-slate-950 dark:border-slate-800">
                    <p className="text-xs text-slate-500">Jam Masuk (Clock In)</p>
                    <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">
                      {todayShift.startTime} WIB
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100 dark:bg-slate-950 dark:border-slate-800">
                    <p className="text-xs text-slate-500">Jam Pulang (Clock Out)</p>
                    <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">
                      {todayShift.endTime} WIB
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Hari Ini Libur / Off</p>
                <p className="text-xs text-slate-500 mt-1">Anda tidak memiliki jadwal shift kerja resmi untuk hari ini.</p>
              </div>
            )}
          </div>
        </div>

        {/* 2. Shift Berikutnya */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-600 text-white">
                <Clock className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">2. Shift Berikutnya</h2>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              Mendatang
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {tomorrowShift ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Jadwal Shift Besok</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                      {tomorrowShift.name}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {dayNames[(today.getDay() + 1) % 7]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100 dark:bg-slate-950 dark:border-slate-800">
                    <p className="text-xs text-slate-500">Estimasi Masuk</p>
                    <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">
                      {tomorrowShift.startTime} WIB
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100 dark:bg-slate-950 dark:border-slate-800">
                    <p className="text-xs text-slate-500">Estimasi Pulang</p>
                    <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">
                      {tomorrowShift.endTime} WIB
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Besok Libur / Off</p>
                <p className="text-xs text-slate-500 mt-1">Tidak ada jadwal shift kerja untuk esok hari.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. JADWAL MINGGU INI */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">3. Jadwal Minggu Ini</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">Senin - Minggu</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-7">
          {weeklyDays.map((d, index) => (
            <div
              key={index}
              className={cn(
                'flex flex-col items-center justify-between rounded-2xl border p-3 text-center transition-all',
                d.isToday
                  ? 'border-[#6F4E37] bg-[#6F4E37]/10 ring-2 ring-[#6F4E37]/30 dark:bg-[#6F4E37]/20'
                  : 'border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950'
              )}
            >
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{d.dayName}</span>
              <span
                className={cn(
                  'my-1 text-base font-extrabold',
                  d.isToday ? 'text-[#6F4E37] dark:text-amber-300' : 'text-slate-800 dark:text-slate-100'
                )}
              >
                {d.dateNum}
              </span>
              <div className="w-full pt-1 border-t border-slate-200/50 dark:border-slate-800">
                <span
                  className={cn(
                    'block text-[10px] font-bold truncate',
                    d.shiftName !== 'Libur / Off'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-500'
                  )}
                >
                  {d.shiftName}
                </span>
                <span className="block text-[9px] font-mono text-slate-400">{d.shiftTime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TEAM ROSTER: SIAPA BERTUGAS HARI INI, BESOK, & SEMINGGU KE DEPAN */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800 dark:text-amber-100 flex items-center gap-2">
                Jadwal Penugasan Rekan Kerja (7 Hari Ke Depan)
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  Roster Tim Store
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pantau siapa saja rekan kerja bertugas hari ini, besok, dan seminggu ke depan dari Roster Matriks Admin.
              </p>
            </div>
          </div>

          <div className="relative max-w-xs w-full">
            <input
              type="text"
              placeholder="Cari nama rekan kerja..."
              value={rosterSearchQuery}
              onChange={(e) => setRosterSearchQuery(e.target.value)}
              className="flex h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pl-8 text-xs font-medium transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* 7-DAY INTERACTIVE TABS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {roster7Days.map((dayItem, idx) => {
            const isSelected = selectedRosterDayIndex === idx;
            return (
              <button
                key={dayItem.dateStr}
                type="button"
                onClick={() => setSelectedRosterDayIndex(idx)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer',
                  isSelected
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : dayItem.isToday
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-300'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                )}
              >
                <span>{dayItem.label}</span>
                <span className={cn('text-[10px] opacity-80', isSelected ? 'text-indigo-100' : 'text-slate-500')}>
                  {dayItem.formattedDate}
                </span>
              </button>
            );
          })}
        </div>

        {/* SHIFT CARDS & TEAM MEMBERS FOR SELECTED DAY */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {selectedDayShifts.map((group) => (
            <div
              key={group.shiftId}
              className={cn(
                'rounded-2xl border p-4 transition-all',
                group.isOff
                  ? 'border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40'
                  : 'border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-white shadow-sm dark:border-indigo-950 dark:from-slate-900 dark:to-slate-900'
              )}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{group.shiftName}</h4>
                  <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">{group.shiftTime}</p>
                </div>
                <span className={cn(
                  'rounded-xl px-2.5 py-1 text-xs font-bold',
                  group.isOff
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                )}>
                  {group.members.length} Rekan
                </span>
              </div>

              <div className="mt-3.5 space-y-2 max-h-60 overflow-y-auto pr-1">
                {group.members.length === 0 ? (
                  <p className="text-xs italic text-slate-400 py-2 text-center">Tidak ada karyawan pada shift ini.</p>
                ) : (
                  group.members.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700/60"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-extrabold text-xs dark:bg-indigo-950/80 dark:text-indigo-300">
                          {member.firstName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {member.firstName} {member.lastName || ''}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{member.user?.role?.name || 'Karyawan'}</p>
                        </div>
                      </div>
                      {member.statusTag && (
                        <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          {member.statusTag}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. KALENDER JADWAL SAYA & 5. STATISTIK KEHADIRAN SAYA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 4. Kalender Jadwal Saya (2 Cols) */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
                <CalendarIcon className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">4. Kalender Jadwal Saya</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                className="rounded-xl border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {monthNames[month]} {year}
              </span>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                className="rounded-xl border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 mb-2">
              <div>Min</div><div>Sen</div><div>Sel</div><div>Rab</div><div>Kam</div><div>Jum</div><div>Sab</div>
            </div>
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="h-10 rounded-xl bg-transparent" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateObj = new Date(year, month, dayNum);
                const dayShift = getEffectiveShiftForDate(dateObj, employeeData);
                const isToday =
                  dayNum === new Date().getDate() &&
                  month === new Date().getMonth() &&
                  year === new Date().getFullYear();

                return (
                  <div
                    key={`day-${dayNum}`}
                    className={cn(
                      'flex flex-col items-center justify-center h-11 rounded-2xl border transition-all',
                      isToday
                        ? 'bg-[#6F4E37] text-white font-bold border-[#6F4E37] shadow-md'
                        : dayShift?.specialType === 'LEAVE'
                        ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
                        : dayShift?.specialType === 'SICK'
                        ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
                        : dayShift?.specialType === 'PERMISSION'
                        ? 'border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300'
                        : dayShift
                        ? 'border-emerald-200/80 bg-emerald-50/40 text-slate-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-slate-200'
                        : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'
                    )}
                  >
                    <span>{dayNum}</span>
                    <span
                      className={cn(
                        'text-[9px] truncate max-w-[45px] font-bold',
                        isToday
                          ? 'text-amber-200'
                          : dayShift?.specialType === 'LEAVE'
                          ? 'text-blue-700 dark:text-blue-300'
                          : dayShift?.specialType === 'SICK'
                          ? 'text-rose-700 dark:text-rose-300'
                          : dayShift?.specialType === 'PERMISSION'
                          ? 'text-purple-700 dark:text-purple-300'
                          : dayShift
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-400'
                      )}
                    >
                      {dayShift && dayShift.name ? dayShift.name.split(' ')[0] : 'Off'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5. Statistik Kehadiran Saya (1 Col) */}
        <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" /> 5. Statistik Kehadiran
            </h2>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Hadir Tepat Waktu</span>
                <span className="text-lg font-bold text-emerald-800 dark:text-emerald-300">{presentCount}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Terlambat</span>
                <span className="text-lg font-bold text-amber-800 dark:text-amber-300">{lateCount}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">Izin / Cuti / Off</span>
                <span className="text-lg font-bold text-blue-800 dark:text-blue-300">{leaveCount}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Total Record Presensi</span>
                <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{totalAttendances}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. RIWAYAT SHIFT SAYA */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#6F4E37]" /> 6. Riwayat Shift & Kehadiran Saya
          </h2>
          <span className="text-xs text-slate-500">Record Terakhir</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          {myAttendances.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center italic">Belum ada riwayat absensi tercatat.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-400 dark:bg-slate-950">
                <tr>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Clock In</th>
                  <th className="p-3">Clock Out</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {myAttendances.slice(0, 10).map((att: any, idx: number) => (
                  <tr key={att.id || idx}>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">
                      {formatDateSafe(att.date)}
                    </td>
                    <td className="p-3 font-mono">{formatTimeSafe(att.clockIn)}</td>
                    <td className="p-3 font-mono">{formatTimeSafe(att.clockOut)}</td>
                    <td className="p-3">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-lg text-[11px] font-semibold',
                          att.status === 'PRESENT'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : att.status === 'LATE'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        )}
                      >
                        {att.status || '-'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 italic">{att.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <EmployeeRequestDrawer
        isOpen={isRequestDrawerOpen}
        initialType={drawerType}
        onClose={() => setIsRequestDrawerOpen(false)}
        onSuccess={() => {
          // Refresh employee profile & workspace data
          const fetchRefreshed = async () => {
            try {
              const empRes = await api.get('/employees/me');
              setEmployeeData(empRes.data || null);
              const attRes = await api.get('/attendance/me');
              setMyAttendances(Array.isArray(attRes.data) ? attRes.data : []);
            } catch (e) {
              console.error('Error refreshing workspace:', e);
            }
          };
          fetchRefreshed();
        }}
        currentEmployee={employeeData}
      />
    </div>
  );
}
