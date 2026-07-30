import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CalendarClock,
  Camera,
  CheckCircle2,
  Clock3,
  Globe,
  MapPin,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react';
import dayjs from 'dayjs';
import { io } from 'socket.io-client';
import api from '@/lib/api';

type Photo = {
  id?: string | number;
  type?: string;
  photoUrl?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  ipAddress?: string | null;
  createdAt?: string | null;
};

type MonitoringItem = {
  employee?: {
    id?: string | number;
    firstName?: string;
    lastName?: string;
    position?: string | null;
    roleName?: string | null;
  };
  shift?: {
    name?: string;
    startTime?: string;
    endTime?: string;
  } | null;
  attendance?: {
    clockIn?: string | null;
    clockOut?: string | null;
    photos?: Photo[] | null;
  } | null;
  status?: string;
};

const EXPECTED_MINUTES = 8 * 60;

function employeeName(item: MonitoringItem) {
  const name = [item.employee?.firstName, item.employee?.lastName].filter(Boolean).join(' ').trim();
  return name || 'Karyawan tanpa nama';
}

function employeeRoleOrPosition(item: MonitoringItem) {
  return item.employee?.position || item.employee?.roleName || 'Karyawan';
}

function formatTime(value?: string | null) {
  return value && dayjs(value).isValid() ? dayjs(value).format('HH:mm') : '—';
}

function formatDuration(start?: string | null, end?: string | null, now = Date.now()) {
  if (!start || !dayjs(start).isValid()) return 'Belum mulai';
  const endTime = end && dayjs(end).isValid() ? dayjs(end) : dayjs(now);
  const minutes = Math.max(0, endTime.diff(dayjs(start), 'minute'));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}j ${remainder}m`;
}

function getDurationMinutes(start?: string | null, end?: string | null, now = Date.now()) {
  if (!start || !dayjs(start).isValid()) return 0;
  return Math.max(0, (end && dayjs(end).isValid() ? dayjs(end) : dayjs(now)).diff(dayjs(start), 'minute'));
}

function statusKind(item: MonitoringItem) {
  const status = (item.status || '').toLowerCase();
  if (item.attendance?.clockIn && !item.attendance?.clockOut) return 'working';
  if (item.attendance?.clockOut) return 'completed';
  if (status.includes('terlambat')) return 'late';
  if (status.includes('tidak') || status.includes('absen')) return 'absent';
  return 'pending';
}

const statusStyles = {
  working: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  completed: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300',
  late: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
  absent: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300',
  pending: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-[#49352a] dark:bg-[#1c130d] dark:text-amber-200/70',
};

function StatusBadge({ item }: { item: MonitoringItem }) {
  const kind = statusKind(item);
  const label = item.status || (kind === 'working' ? 'Sedang bekerja' : kind === 'completed' ? 'Selesai' : 'Belum absen');
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold ${statusStyles[kind]}`}>
      {kind === 'working' && <span className="relative flex h-2 w-2" aria-hidden="true"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>}
      {label}
    </span>
  );
}

function Shortfall({ item, now }: { item: MonitoringItem; now: number }) {
  if (!item.attendance?.clockIn) return null;
  const minutes = getDurationMinutes(item.attendance.clockIn, item.attendance.clockOut, now);
  if (minutes >= EXPECTED_MINUTES) return <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Target tercapai</span>;
  const shortage = EXPECTED_MINUTES - minutes;
  return <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">Kurang {Math.floor(shortage / 60)}j {shortage % 60}m</span>;
}

function SelfieButton({ item, onOpen }: { item: MonitoringItem; onOpen: () => void }) {
  const photos = Array.isArray(item.attendance?.photos) ? item.attendance!.photos!.filter((photo) => photo?.photoUrl) : [];
  return photos.length ? (
    <button type="button" onClick={onOpen} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:border-[#49352a] dark:bg-[#1c130d] dark:text-amber-100 dark:hover:border-amber-700/60 dark:hover:bg-amber-950/30 dark:focus:ring-amber-500 dark:focus:ring-offset-[#221812]">
      <Camera className="h-3.5 w-3.5" /> Lihat Selfie <span className="text-slate-400 dark:text-amber-400/60">({photos.length})</span>
    </button>
  ) : (
    <span className="inline-flex h-8 items-center gap-1.5 text-xs text-slate-400 dark:text-amber-400/50"><Camera className="h-3.5 w-3.5" /> Belum ada selfie</span>
  );
}

function SelfieModal({ item, onClose }: { item: MonitoringItem; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const photos = Array.isArray(item.attendance?.photos) ? item.attendance!.photos!.filter((photo) => photo?.photoUrl) : [];
  const photoFor = (type: string) => photos.find((photo) => (photo.type || '').toUpperCase() === type);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const renderPhoto = (photo: Photo | undefined, label: string, timestamp?: string | null) => {
    const latitude = Number(photo?.latitude);
    const longitude = Number(photo?.longitude);
    const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
    return (
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-[#3e2e24] dark:bg-[#1c130d]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-[#3e2e24]">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-amber-100">{label}</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-amber-300/60">{timestamp && dayjs(timestamp).isValid() ? dayjs(timestamp).format('DD MMM YYYY, HH:mm:ss') : 'Waktu tidak tersedia'}</p>
          </div>
          {photo && <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="Selfie tersedia" />}
        </div>
        {photo?.photoUrl ? (
          <>
            <img src={photo.photoUrl} alt={`Selfie ${label.toLowerCase()} ${employeeName(item)}`} loading="lazy" className="max-h-[420px] w-full bg-slate-100 object-contain dark:bg-[#17100b]" />
            <dl className="grid gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-[#3e2e24] dark:bg-[#17100b] dark:text-amber-200/70">
              <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-amber-400/50" /><dt className="sr-only">Koordinat</dt><dd>{hasCoordinates ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : 'Koordinat tidak tersedia'}</dd></div>
              <div className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-slate-400 dark:text-amber-400/50" /><dt className="sr-only">Alamat IP</dt><dd>{photo.ipAddress ? `IP ${photo.ipAddress}` : 'Alamat IP tidak tersedia'}</dd></div>
            </dl>
          </>
        ) : (
          <div className="flex min-h-44 flex-col items-center justify-center gap-2 bg-slate-50 px-5 text-center text-slate-400 dark:bg-[#17100b] dark:text-amber-400/50">
            <Camera className="h-7 w-7" />
            <p className="text-sm font-medium">Selfie {label.toLowerCase()} belum tersedia</p>
          </div>
        )}
      </section>
    );
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="selfie-title" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Tutup detail selfie" className="absolute inset-0 bg-slate-950/55" onClick={onClose} />
      <div className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-[#3e2e24] dark:bg-[#221812]">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-[#3e2e24] dark:bg-[#221812]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-amber-300/60">Bukti kehadiran</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 id="selfie-title" className="text-lg font-bold text-slate-950 dark:text-amber-50">{employeeName(item)}</h2>
              <StatusBadge item={item} />
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-amber-300/60">{employeeRoleOrPosition(item)}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Tutup" className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:text-amber-300/60 dark:hover:bg-amber-950/40 dark:hover:text-amber-100 dark:focus:ring-amber-500"><X className="h-5 w-5" /></button>
        </header>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {renderPhoto(photoFor('CLOCK_IN'), 'Check In', item.attendance?.clockIn)}
          {renderPhoto(photoFor('CLOCK_OUT'), 'Check Out', item.attendance?.clockOut)}
        </div>
      </div>
    </div>
  );
}

export default function AdminAttendancePage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<MonitoringItem | null>(null);
  const [now, setNow] = useState(Date.now());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['monitoringData'],
    queryFn: async () => {
      const response = await api.get('/attendance/monitoring');
      return Array.isArray(response.data) ? response.data as MonitoringItem[] : [];
    },
    refetchInterval: 60_000,
  });

  const monitoringData = Array.isArray(data) ? data : [];

  useEffect(() => {
    if (data) setLastUpdated(new Date());
  }, [data]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const socket = io();
    const refresh = () => void refetch();
    socket.on('attendance_update', refresh);
    return () => {
      socket.off('attendance_update', refresh);
      socket.disconnect();
    };
  }, [refetch]);

  const summary = useMemo(() => ({
    total: monitoringData.length,
    working: monitoringData.filter((item) => statusKind(item) === 'working').length,
    completed: monitoringData.filter((item) => statusKind(item) === 'completed').length,
    late: monitoringData.filter((item) => (item.status || '').toLowerCase().includes('terlambat')).length,
    absent: monitoringData.filter((item) => statusKind(item) === 'absent').length,
  }), [monitoringData]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return monitoringData.filter((item) => {
      const matchesText = !term || `${employeeName(item)} ${item.employee?.position || ''}`.toLowerCase().includes(term);
      const matchesStatus = filter === 'all'
        || (filter === 'late'
          ? (item.status || '').toLowerCase().includes('terlambat')
          : statusKind(item) === filter);
      return matchesText && matchesStatus;
    });
  }, [monitoringData, search, filter]);

  const stats = [
    { label: 'Total karyawan', value: summary.total, icon: Users, tone: 'text-slate-600 bg-slate-100 dark:bg-amber-950/40 dark:text-amber-200' },
    { label: 'Sedang bekerja', value: summary.working, icon: Clock3, tone: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300' },
    { label: 'Selesai', value: summary.completed, icon: CheckCircle2, tone: 'text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300' },
    { label: 'Terlambat', value: summary.late, icon: CalendarClock, tone: 'text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300' },
    { label: 'Tidak hadir', value: summary.absent, icon: AlertCircle, tone: 'text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300' },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-amber-50">Monitoring Absensi</h1>
            <span className="inline-flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Pantau status kerja dan bukti absensi karyawan hari ini.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-amber-300/60">
          <span>{lastUpdated ? `Diperbarui ${dayjs(lastUpdated).format('HH:mm:ss')}` : 'Menyiapkan data...'}</span>
          <button type="button" onClick={() => void refetch()} disabled={isFetching} aria-label="Perbarui data" className="rounded-md border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 dark:border-[#3e2e24] dark:bg-[#1c130d] dark:text-amber-200 dark:hover:bg-amber-950/30 dark:focus:ring-amber-500"><RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /></button>
        </div>
      </header>

      <section aria-label="Ringkasan absensi" className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-5 dark:border-[#3e2e24] dark:bg-[#3e2e24]">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="flex items-center gap-3 bg-white px-3 py-3 dark:bg-[#221812]">
            <span className={`rounded-md p-2 ${tone}`}><Icon className="h-4 w-4" /></span>
            <div><p className="text-xl font-bold leading-none text-slate-950 dark:text-amber-50">{isLoading ? '—' : value}</p><p className="mt-1 text-[11px] text-slate-500 dark:text-amber-300/60">{label}</p></div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-[#3e2e24] dark:bg-[#221812]">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#3e2e24]">
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">Cari karyawan</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-amber-400/50" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau posisi..." className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-[#49352a] dark:bg-[#1c130d] dark:text-amber-100 dark:placeholder:text-amber-400/40 dark:focus:border-amber-600 dark:focus:ring-amber-500/20" />
          </label>
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0" aria-label="Filter status">
            {[['all', 'Semua'], ['working', 'Bekerja'], ['completed', 'Selesai'], ['late', 'Terlambat'], ['absent', 'Tidak hadir']].map(([value, label]) => (
              <button key={value} type="button" onClick={() => setFilter(value)} className={`h-8 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-amber-500 ${filter === value ? 'bg-slate-900 text-white dark:bg-amber-600 dark:text-[#17100b]' : 'text-slate-600 hover:bg-slate-100 dark:text-amber-200/70 dark:hover:bg-amber-950/30'}`}>{label}</button>
            ))}
          </div>
        </div>

        {isError ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="rounded-full bg-red-50 p-3 text-red-600 dark:bg-red-950/40 dark:text-red-300"><AlertCircle className="h-6 w-6" /></span>
            <div><p className="font-semibold text-slate-900 dark:text-amber-100">Data monitoring gagal dimuat</p><p className="mt-1 text-sm text-slate-500 dark:text-amber-300/60">Periksa koneksi lalu coba kembali.</p></div>
            <button type="button" onClick={() => void refetch()} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:bg-amber-600 dark:text-[#17100b] dark:hover:bg-amber-500 dark:focus:ring-amber-400">Coba Lagi</button>
          </div>
        ) : isLoading ? (
          <div className="divide-y divide-slate-100 dark:divide-[#3e2e24]">
            {[1, 2, 3, 4].map((row) => <div key={row} className="grid grid-cols-[2fr_1fr_1fr] gap-5 p-4"><div className="h-10 animate-pulse rounded bg-slate-100 dark:bg-amber-950/30" /><div className="h-10 animate-pulse rounded bg-slate-100 dark:bg-amber-950/30" /><div className="h-10 animate-pulse rounded bg-slate-100 dark:bg-amber-950/30" /></div>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
            <Users className="mb-3 h-8 w-8 text-slate-300 dark:text-amber-700/60" />
            <p className="font-semibold text-slate-800 dark:text-amber-100">{monitoringData.length === 0 ? 'Belum ada karyawan' : 'Tidak ada hasil yang sesuai'}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-amber-300/60">{monitoringData.length === 0 ? 'Data karyawan akan muncul di sini.' : 'Coba ubah kata pencarian atau filter status.'}</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[920px] text-left">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-[#1c130d] dark:text-amber-300/70">
                  <tr><th className="px-4 py-2.5">Karyawan</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Shift</th><th className="px-3 py-2.5">Masuk / Keluar</th><th className="px-3 py-2.5">Durasi kerja</th><th className="px-4 py-2.5 text-right">Bukti</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#3e2e24]">
                  {filtered.map((item, index) => (
                    <tr key={item.employee?.id ?? index} className="transition hover:bg-slate-50/70 dark:hover:bg-amber-950/20">
                      <td className="px-4 py-3"><p className="text-sm font-semibold text-slate-900 dark:text-amber-100">{employeeName(item)}</p><p className="mt-0.5 text-xs text-slate-500 dark:text-amber-300/60">{employeeRoleOrPosition(item)}</p></td>
                      <td className="px-3 py-3"><StatusBadge item={item} /></td>
                      <td className="px-3 py-3"><p className="text-xs font-semibold text-slate-700 dark:text-amber-200">{item.shift?.name || 'Tanpa shift'}</p><p className="mt-0.5 text-[11px] text-slate-500 dark:text-amber-300/60">{item.shift ? `${item.shift.startTime || '—'}–${item.shift.endTime || '—'}` : 'Jadwal belum diatur'}</p></td>
                      <td className="px-3 py-3 text-xs"><span className="font-semibold text-emerald-700 dark:text-emerald-400">{formatTime(item.attendance?.clockIn)}</span><span className="mx-1.5 text-slate-300 dark:text-amber-700/60">→</span><span className="font-semibold text-blue-700 dark:text-blue-400">{formatTime(item.attendance?.clockOut)}</span></td>
                      <td className="px-3 py-3"><p className="text-sm font-bold tabular-nums text-slate-800 dark:text-amber-100">{formatDuration(item.attendance?.clockIn, item.attendance?.clockOut, now)}</p><Shortfall item={item} now={now} /></td>
                      <td className="px-4 py-3 text-right"><SelfieButton item={item} onOpen={() => setSelectedItem(item)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-[#3e2e24] md:hidden">
              {filtered.map((item, index) => (
                <article key={item.employee?.id ?? index} className="p-4">
                  <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900 dark:text-amber-100">{employeeName(item)}</h2><p className="mt-0.5 text-xs text-slate-500 dark:text-amber-300/60">{employeeRoleOrPosition(item)}</p></div><StatusBadge item={item} /></div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-slate-50 p-3 dark:bg-[#1c130d]">
                    <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-amber-400/50">Shift</p><p className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-amber-200">{item.shift?.name || 'Tanpa shift'}</p><p className="text-[11px] text-slate-500 dark:text-amber-300/60">{item.shift ? `${item.shift.startTime || '—'}–${item.shift.endTime || '—'}` : 'Belum diatur'}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-amber-400/50">Masuk / Keluar</p><p className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-amber-200">{formatTime(item.attendance?.clockIn)} → {formatTime(item.attendance?.clockOut)}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-amber-400/50">Durasi kerja</p><p className="mt-0.5 text-sm font-bold tabular-nums text-slate-800 dark:text-amber-100">{formatDuration(item.attendance?.clockIn, item.attendance?.clockOut, now)}</p></div>
                    <div className="flex items-end justify-end"><Shortfall item={item} now={now} /></div>
                  </div>
                  <div className="mt-3 flex justify-end"><SelfieButton item={item} onOpen={() => setSelectedItem(item)} /></div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {selectedItem && <SelfieModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  );
}
