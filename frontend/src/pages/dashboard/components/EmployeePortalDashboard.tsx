import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Coffee,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, Button } from '@/components/ui/design-system';

type AttendanceStatusResponse = {
  canClockIn: boolean;
  canClockOut: boolean;
  isWithinRadius: boolean | null;
  distanceMeter: number | null;
  allowedRadiusMeter: number | null;
  status: string | null;
  attendance: {
    id: string;
    clockIn: string;
    clockOut: string | null;
    status: string;
  } | null;
  shift: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  } | null;
};

export default function EmployeePortalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      );
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const statusQuery = useQuery<AttendanceStatusResponse>({
    queryKey: ['employee-portal-status'],
    queryFn: async () => (await api.get('/attendance/status')).data,
    refetchInterval: 15_000
  });

  if (statusQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-3xl bg-amber-500/10 dark:bg-amber-950/20" />
      </div>
    );
  }

  if (statusQuery.isError || !statusQuery.data) {
    return (
      <Card className="border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20">
        <CardContent className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
          <h2 className="font-semibold text-slate-900 dark:text-white">Gagal memuat status presensi karyawan</h2>
          <Button onClick={() => statusQuery.refetch()} className="mt-4 gap-2">
            <RefreshCw className="h-4 w-4" /> Coba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusData = statusQuery.data;
  const attendance = statusData.attendance;
  const shift = statusData.shift;

  const clockInFormatted = attendance?.clockIn
    ? new Date(attendance.clockIn).toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Employee Real Banner */}
      <section className="relative overflow-hidden rounded-[20px] sm:rounded-[28px] border border-amber-500/20 bg-gradient-to-br from-[#fffdfa] via-[#fdf6ec] to-[#f5ebdc] p-3.5 sm:p-5 lg:p-7 shadow-sm dark:border-[#3e2e24] dark:from-[#241a13] dark:via-[#1e1510] dark:to-[#17100b]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
              <Coffee className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="truncate">Barista / Staff Portal · Real Status</span>
            </div>
            <h2 className="mt-2 text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-tight leading-snug text-slate-900 dark:text-amber-50">
              Portal Absensi Real-Time Kopi Selon
            </h2>
            <p className="mt-1 text-xs sm:text-sm font-medium leading-relaxed text-slate-600 dark:text-amber-200/80">
              Absensi presisi dengan verifikasi selfie & lokasi GPS radius outlet.
            </p>
          </div>
          <Badge variant={statusData.canClockIn ? 'warning' : attendance?.clockOut ? 'neutral' : 'success'} className="w-fit px-2.5 py-1 text-[11px] font-bold">
            {statusData.canClockIn ? '⏰ Belum Presensi Masuk' : attendance?.clockOut ? '✅ Selesai Shift Hari Ini' : '🟢 Sedang Bekerja'}
          </Badge>
        </div>
      </section>

      {/* Real Clock-In / Clock-Out Card */}
      <section className="grid gap-4 sm:gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden border-amber-500/25 bg-white shadow-sm dark:border-[#3e2e24] dark:bg-[#221812]">
          <CardContent className="p-4 sm:p-6 lg:p-6.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Jam Digital WIB Real-time</p>
                <p className="mt-1 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-none text-slate-900 dark:text-amber-50">{currentTime || '--:--:--'}</p>
              </div>
              <div className="flex h-11 w-11 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                <Clock3 className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>
            </div>

            <div className="mt-4 sm:mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-3 sm:p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-amber-300/60">Shift Hari Ini (Real DB)</p>
                <p className="mt-1 text-sm sm:text-base font-bold leading-snug text-slate-900 dark:text-amber-100">
                  {shift ? `${shift.startTime} - ${shift.endTime}` : 'Tidak Ada Shift'}
                </p>
                <p className="mt-0.5 text-[11px] sm:text-xs font-semibold text-amber-700 dark:text-amber-400">{shift?.name || 'Reguler'}</p>
              </div>
              <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-3 sm:p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-amber-300/60">Status Catatan Absensi</p>
                <p className="mt-1 text-sm sm:text-base font-bold leading-snug text-amber-600 dark:text-amber-400">
                  {attendance ? (attendance.clockOut ? 'SUDAH PULANG' : `BEKERJA (Masuk ${clockInFormatted})`) : 'BELUM MASUK'}
                </p>
                <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500 dark:text-amber-300/60">
                  {attendance?.status === 'ON_TIME' ? 'Tepat Waktu' : attendance?.status === 'LATE' ? 'Terlambat' : 'Status Real'}
                </p>
              </div>
            </div>

            {/* Direct Action Button to Real Attendance Camera Page */}
            <div className="mt-4 sm:mt-5">
              <Button
                size="lg"
                onClick={() => navigate('/dashboard/attendance')}
                className="w-full h-12 sm:h-14 bg-amber-600 text-white font-bold text-xs sm:text-base hover:bg-amber-700 shadow-md gap-2 rounded-2xl"
              >
                <CameraIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                {statusData.canClockIn ? 'Buka Kamera Presensi (Clock In)' : statusData.canClockOut ? 'Buka Kamera Presensi (Clock Out)' : 'Lihat Status Presensi Saya'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Real User Profile Card */}
        <div className="space-y-6">
          <Card className="border-amber-500/20 bg-white dark:border-[#3a2b20] dark:bg-[#221812]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <UserCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Data Barista Logged-In
              </CardTitle>
              <Badge variant="neutral">Active Session</Badge>
            </CardHeader>
            <CardContent className="flex items-center gap-4 pt-2">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-800 dark:text-amber-200 font-extrabold text-2xl">
                {user?.username?.substring(0, 2).toUpperCase() || 'KS'}
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-amber-50">{user?.username}</p>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Role: {user?.role}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Akun Terverifikasi
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function CameraIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h3.172a2 2 0 001.414-.586l.828-.828A2 2 0 0111.828 5h0.344a2 2 0 011.414.586l.828.828A2 2 0 0015.828 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
