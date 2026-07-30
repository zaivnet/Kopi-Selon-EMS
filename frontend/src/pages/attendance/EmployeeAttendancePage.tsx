import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Camera,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  LocateFixed,
  MapPin,
  RefreshCw,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, Button } from '@/components/ui/design-system';

type Readiness = 'loading' | 'ready' | 'error';
type LocationReadiness = 'acquiring' | 'checking' | 'ready' | 'gps-error' | 'radius-error';
type LocationState = {
  lat: number;
  lng: number;
  accuracy: number | null;
};
type RadiusState = {
  inRadius: boolean;
  distanceMeters: number;
  radiusMeters: number;
  message: string;
};

function cameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Izin kamera ditolak. Buka pengaturan situs di browser, izinkan Kamera, lalu tekan Coba Kamera Lagi.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Kamera tidak ditemukan pada perangkat ini. Pastikan perangkat memiliki kamera yang aktif.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.';
  }
  return 'Kamera gagal dibuka. Periksa izin browser dan pastikan halaman diakses melalui HTTPS atau localhost.';
}

function gpsErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Izin lokasi ditolak. Aktifkan GPS dan izinkan Lokasi pada pengaturan situs, lalu coba lagi.';
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'Lokasi tidak tersedia. Aktifkan GPS, pindah ke area dengan sinyal lebih baik, lalu coba lagi.';
  }
  if (error.code === error.TIMEOUT) {
    return 'Pencarian lokasi terlalu lama. Pastikan GPS aktif lalu tekan Perbarui GPS.';
  }
  return 'Lokasi gagal ditemukan. Periksa GPS dan izin lokasi perangkat.';
}

export default function EmployeeAttendancePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const gpsWatchRef = useRef<number | null>(null);
  const gpsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gpsRequestRef = useRef(0);
  const mountedRef = useRef(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<Readiness>('loading');
  const [cameraError, setCameraError] = useState('');
  const [locationState, setLocationState] = useState<LocationReadiness>('acquiring');
  const [location, setLocation] = useState<LocationState | null>(null);
  const [radius, setRadius] = useState<RadiusState | null>(null);
  const [locationError, setLocationError] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'camera'>('status');

  const { data: status, error: statusError, refetch } = useQuery({
    queryKey: ['attendanceStatus'],
    queryFn: async () => (await api.get('/attendance/status')).data,
    retry: false
  });

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraState('loading');
    setCameraError('');
    stopCamera();

    if (!window.isSecureContext) {
      setCameraState('error');
      setCameraError('Kamera hanya dapat digunakan melalui HTTPS atau localhost. Buka aplikasi dari alamat yang aman.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('error');
      setCameraError('Browser ini tidak mendukung akses kamera. Gunakan Chrome, Safari, atau browser modern lainnya.');
      return;
    }

    try {
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 1280 },
            height: { ideal: 960 }
          },
          audio: false
        });
      } catch (firstError) {
        if (firstError instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(firstError.name)) {
          throw firstError;
        }
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      if (!mountedRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = mediaStream;
      setStream(mediaStream);
    } catch (error) {
      if (!mountedRef.current) return;
      setStream(null);
      setCameraState('error');
      setCameraError(cameraErrorMessage(error));
    }
  }, [stopCamera]);

  useEffect(() => {
    if (activeTab !== 'camera') {
      stopCamera();
      return;
    }
    void startCamera();
  }, [activeTab, startCamera, stopCamera]);

  useEffect(() => {
    const video = videoRef.current;
    if (activeTab !== 'camera' || !video || !stream) return;

    video.srcObject = stream;
    const playVideo = async () => {
      try {
        await video.play();
        setCameraState('ready');
      } catch (err) {
        console.warn('Video autoplay notice:', err);
        setCameraState('ready');
      }
    };
    void playVideo();
  }, [stream, activeTab]);

  const stopGpsAcquisition = useCallback(() => {
    if (gpsWatchRef.current !== null) {
      navigator.geolocation?.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
    if (gpsTimerRef.current !== null) {
      clearTimeout(gpsTimerRef.current);
      gpsTimerRef.current = null;
    }
  }, []);

  const refreshLocation = useCallback((manual = true) => {
    stopGpsAcquisition();
    const requestId = ++gpsRequestRef.current;
    setLocationState('acquiring');
    setLocationError('');
    setRadius(null);
    setLocation(null);

    if (!window.isSecureContext) {
      setLocationState('gps-error');
      setLocationError('GPS browser memerlukan HTTPS atau localhost. Buka aplikasi dari alamat yang aman.');
      return;
    }
    if (!navigator.geolocation) {
      setLocationState('gps-error');
      setLocationError('Browser ini tidak mendukung lokasi GPS. Gunakan browser modern pada perangkat Anda.');
      return;
    }

    let bestFix: LocationState | null = null;
    let finished = false;

    const finishWithBestFix = async () => {
      if (finished || requestId !== gpsRequestRef.current) return;
      finished = true;
      stopGpsAcquisition();
      if (!bestFix) {
        setLocationState('gps-error');
        setLocationError('GPS belum menghasilkan koordinat yang valid. Aktifkan GPS lalu coba lagi di area yang lebih terbuka.');
        return;
      }

      const selectedFix = bestFix;
      setLocation(selectedFix);
      setLocationState('checking');
      try {
        const response = await api.post('/attendance/location-check', {
          latitude: selectedFix.lat,
          longitude: selectedFix.lng
        });
        if (!mountedRef.current || requestId !== gpsRequestRef.current) return;
        setRadius(response.data);
        setLocationState('ready');
      } catch (error: any) {
        if (!mountedRef.current || requestId !== gpsRequestRef.current) return;
        if (error.response?.status === 401) return;
        setLocationState('radius-error');
        if (error.response?.status === 404) {
          setLocationError('Layanan pemeriksaan radius belum tersedia. Server aplikasi perlu diperbarui atau dimulai ulang oleh administrator.');
        } else if (!error.response) {
          setLocationError('Server tidak dapat dihubungi. Periksa koneksi jaringan lalu tekan Perbarui GPS.');
        } else {
          setLocationError(error.response.data?.message || 'Pemeriksaan radius gagal. Tekan Perbarui GPS untuk mencoba lagi.');
        }
      }
    };

    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!mountedRef.current || finished || requestId !== gpsRequestRef.current) return;
        const accuracy = Number.isFinite(position.coords.accuracy)
          ? Math.round(position.coords.accuracy)
          : null;
        const fix = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy
        };
        if (
          Number.isFinite(fix.lat) &&
          Number.isFinite(fix.lng) &&
          (bestFix === null ||
            (accuracy !== null && (bestFix.accuracy === null || accuracy < bestFix.accuracy)))
        ) {
          bestFix = fix;
          setLocation(fix);
        }
        if (accuracy !== null && accuracy <= 20) void finishWithBestFix();
      },
      (error) => {
        if (!mountedRef.current || finished || requestId !== gpsRequestRef.current) return;
        if (error.code === error.PERMISSION_DENIED) {
          finished = true;
          stopGpsAcquisition();
          setLocationState('gps-error');
          setLocationError(gpsErrorMessage(error));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: manual ? 0 : 30000
      }
    );
    gpsTimerRef.current = setTimeout(() => void finishWithBestFix(), 12000);
  }, [stopGpsAcquisition]);

  useEffect(() => {
    mountedRef.current = true;
    refreshLocation(false);
    return () => {
      mountedRef.current = false;
      gpsRequestRef.current += 1;
      stopGpsAcquisition();
      stopCamera();
    };
  }, [refreshLocation, stopCamera, stopGpsAcquisition]);

  const cameraReady =
    cameraState === 'ready' &&
    !!videoRef.current &&
    videoRef.current.videoWidth > 0 &&
    videoRef.current.videoHeight > 0;
  const locationReady = locationState === 'ready' && !!location && radius?.inRadius === true;
  const canSubmit = cameraReady && locationReady && !isSubmitting && !!status;
  const configuredRadius = radius?.radiusMeters ?? status?.location?.radiusMeters ?? null;

  const disabledReason = !status
    ? 'Memuat status absensi...'
    : cameraState !== 'ready'
      ? 'Tunggu hingga kamera siap.'
      : locationState === 'acquiring'
        ? 'Tunggu hingga akurasi GPS terbaik ditemukan.'
        : locationState === 'checking'
          ? 'Tunggu pemeriksaan radius selesai.'
        : !radius?.inRadius
          ? radius?.message || locationError || 'Anda harus berada di dalam radius absensi.'
          : null;

  const handleAttendance = async () => {
    if (!canSubmit || !location || !videoRef.current || !canvasRef.current) {
      setNotice({ type: 'error', message: disabledReason || 'Kamera dan lokasi belum siap.' });
      return;
    }

    setNotice(null);
    setIsSubmitting(true);
    try {
      const video = videoRef.current;
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
        throw new Error('Kamera belum menghasilkan gambar. Tunggu sebentar lalu coba lagi.');
      }
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Foto tidak dapat diproses oleh browser.');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photo = canvas.toDataURL('image/jpeg', 0.78);
      if (!photo || photo === 'data:,') throw new Error('Foto selfie kosong. Coba ambil ulang.');

      const type = status.isCheckedIn ? 'CHECK_OUT' : 'CHECK_IN';
      const response = await api.post('/attendance', {
        type,
        photo,
        latitude: location.lat,
        longitude: location.lng,
        browser: navigator.userAgent,
        device: (navigator as any).userAgentData?.platform || navigator.platform
      });
      setNotice({ type: 'success', message: response.data.message });
      await refetch();
      refreshLocation(true);
    } catch (error: any) {
      setNotice({
        type: 'error',
        message: error.response?.data?.message || error.message || 'Absensi gagal. Silakan coba lagi.'
      });
      if (error.response?.data?.code === 'OUTSIDE_ATTENDANCE_RADIUS') refreshLocation(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const attendanceData = status?.attendance || status?.todayAttendance;
  const recentLogs: any[] = status?.recentLogs || [];
  const shiftData = status?.shift;

  const clockInTime = attendanceData?.clockIn
    ? new Date(attendanceData.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : null;
  const clockOutTime = attendanceData?.clockOut
    ? new Date(attendanceData.clockOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 sm:space-y-5 pb-8">
      {/* Header Banner */}
      <header className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
          <UserCheck className="h-6 w-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-amber-50">
          Portal & Status Absensi Karyawan
        </h1>
        <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-amber-200/80">
          Pantau status absensi real-time, detail shift toko, dan riwayat presensi harian Anda.
        </p>
      </header>

      {/* Navigation Tab Switcher */}
      <div className="flex rounded-2xl border border-amber-500/20 bg-amber-500/5 p-1 dark:border-amber-900/30 dark:bg-[#1a120c]">
        <button
          type="button"
          onClick={() => setActiveTab('status')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'status'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 dark:text-amber-200/70 dark:hover:text-amber-100'
          }`}
        >
          <FileText className="h-4 w-4" />
          Status & Detail Absensi
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('camera')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'camera'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 dark:text-amber-200/70 dark:hover:text-amber-100'
          }`}
        >
          <Camera className="h-4 w-4" />
          Kamera Selfie Presensi
        </button>
      </div>

      {activeTab === 'status' ? (
        <div className="space-y-4">
          {/* Real Status Detail Card */}
          <Card className="border-amber-500/20 bg-white dark:border-[#3a2b20] dark:bg-[#221812]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Clock3 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Status Absensi Hari Ini
              </CardTitle>
              <Badge
                variant={status?.isCheckedIn ? 'success' : attendanceData?.clockOut ? 'info' : 'warning'}
                className="px-2.5 py-1 text-[11px] font-bold"
              >
                {status?.isCheckedIn ? '🟢 SEDANG BEKERJA' : attendanceData?.clockOut ? '✅ SELESAI SHIFT' : '⏰ BELUM MASUK'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {/* Grid Status Metrics */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-3.5 dark:border-amber-900/30 dark:bg-amber-950/20">
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-amber-300/70">Waktu Masuk (Clock In)</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-amber-50">
                    {clockInTime ? `${clockInTime} WIB` : 'Belum Absen Masuk'}
                  </p>
                  {attendanceData?.status && (
                    <Badge variant={attendanceData.status === 'LATE' ? 'danger' : 'success'} className="mt-1.5 text-[10px]">
                      {attendanceData.status === 'LATE' ? '⚠️ Terlambat' : 'Tepat Waktu'}
                    </Badge>
                  )}
                </div>

                <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-3.5 dark:border-amber-900/30 dark:bg-amber-950/20">
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-amber-300/70">Waktu Pulang (Clock Out)</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-amber-50">
                    {clockOutTime ? `${clockOutTime} WIB` : status?.isCheckedIn ? 'Sedang Bertugas...' : 'Belum Absen Pulang'}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-amber-700 dark:text-amber-300/80">
                    {clockOutTime ? 'Shift Selesai' : 'Perlu Clock Out saat selesai shift'}
                  </p>
                </div>
              </div>

              {/* Shift Details & GPS Location Info */}
              <div className="space-y-2.5 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4 dark:border-amber-900/30 dark:bg-amber-950/10">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-semibold text-slate-600 dark:text-amber-300/80">Shift Penugasan:</span>
                  <span className="font-bold text-slate-900 dark:text-amber-100">{shiftData ? `${shiftData.name} (${shiftData.startTime} - ${shiftData.endTime} WIB)` : 'Jadwal Reguler Toko'}</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-semibold text-slate-600 dark:text-amber-300/80">Lokasi Outlet:</span>
                  <span className="font-bold text-slate-900 dark:text-amber-100">{status?.location?.name || 'Kopi Selon Outlet Central'}</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-semibold text-slate-600 dark:text-amber-300/80">Verifikasi Lokasi:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">GPS Radius Server Valid</span>
                </div>
              </div>

              {/* Direct Action Button to Camera */}
              <Button
                onClick={() => setActiveTab('camera')}
                className="w-full h-11 bg-amber-600 text-white font-bold text-xs sm:text-sm hover:bg-amber-700 rounded-xl gap-2"
              >
                <Camera className="h-4 w-4" />
                {status?.canClockIn ? 'Buka Kamera Presensi (Clock In)' : status?.canClockOut ? 'Buka Kamera Presensi (Clock Out)' : 'Ambil Ulang Presensi Kamera'}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Attendance History Table */}
          <Card className="border-amber-500/20 bg-white dark:border-[#3a2b20] dark:bg-[#221812]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Riwayat Presensi Saya (10 Terakhir)
              </CardTitle>
              <Badge variant="neutral">{recentLogs.length} Catatan</Badge>
            </CardHeader>
            <CardContent className="pt-2">
              {recentLogs.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="border-b border-amber-500/15 bg-amber-500/5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-300/80">
                      <tr>
                        <th className="p-2.5">Tanggal</th>
                        <th className="p-2.5">Masuk</th>
                        <th className="p-2.5">Pulang</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-500/10 dark:divide-amber-900/20">
                      {recentLogs.map((log: any) => {
                        const dateFormatted = new Date(log.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
                        const inTime = log.clockIn ? new Date(log.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
                        const outTime = log.clockOut ? new Date(log.clockOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

                        return (
                          <tr key={log.id} className="hover:bg-amber-500/5 dark:hover:bg-amber-950/20">
                            <td className="p-2.5 font-semibold text-slate-900 dark:text-amber-100 whitespace-nowrap">{dateFormatted}</td>
                            <td className="p-2.5 font-bold text-amber-700 dark:text-amber-300 whitespace-nowrap">{inTime}</td>
                            <td className="p-2.5 text-slate-600 dark:text-amber-200/80 whitespace-nowrap">{outTime}</td>
                            <td className="p-2.5 whitespace-nowrap">
                              <Badge variant={log.status === 'LATE' ? 'danger' : 'success'} className="text-[10px]">
                                {log.status === 'LATE' ? 'Terlambat' : 'Hadir'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-amber-300/60">
                  Belum ada riwayat absensi tercatat di sistem DB.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Camera Preview Tab */
        <Card className="overflow-hidden">
          <CardContent className="space-y-4 p-4 sm:p-5">
            {notice && (
              <div
                role={notice.type === 'error' ? 'alert' : 'status'}
                aria-live="polite"
                className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                  notice.type === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                    : 'border-destructive/30 bg-destructive/10 text-destructive'
                }`}
              >
                {notice.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
                <span>{notice.message}</span>
              </div>
            )}

            {statusError && (
              <div role="alert" className="flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                {(statusError as any).response?.data?.message || 'Status absensi tidak dapat dimuat.'}
              </div>
            )}

            <section aria-label="Pratinjau kamera" className="relative aspect-[4/5] overflow-hidden rounded-xl bg-slate-950 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(event) => {
                  void event.currentTarget.play();
                  if (event.currentTarget.videoWidth > 0) setCameraState('ready');
                }}
                onCanPlay={(event) => {
                  if (event.currentTarget.videoWidth > 0 && event.currentTarget.videoHeight > 0) setCameraState('ready');
                }}
                className="h-full w-full -scale-x-100 object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              {cameraState !== 'ready' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 px-6 text-center text-white">
                  {cameraState === 'loading' ? <Loader2 className="h-8 w-8 animate-spin text-emerald-400" /> : <Camera className="h-8 w-8 text-red-400" />}
                  <p className="text-sm text-slate-200">{cameraError || 'Menyiapkan kamera depan...'}</p>
                  {cameraState === 'error' && (
                    <button onClick={() => void startCamera()} className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20">
                      <RefreshCw className="h-4 w-4" /> Coba Kamera Lagi
                    </button>
                  )}
                </div>
              )}
              {cameraState === 'ready' && (
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Kamera aktif
                </div>
              )}
            </section>

            <section aria-label="Kesiapan absensi" className="grid grid-cols-2 gap-2">
              <div className={`rounded-lg border p-3 ${cameraReady ? 'border-emerald-500/30 bg-emerald-500/10' : cameraState === 'error' ? 'border-destructive/30 bg-destructive/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  <span className="text-xs font-semibold">{cameraReady ? 'Kamera siap' : cameraState === 'error' ? 'Kamera gagal' : 'Cek kamera'}</span>
                </div>
              </div>
              <div className={`rounded-lg border p-3 ${locationReady ? 'border-emerald-500/30 bg-emerald-500/10' : locationState === 'gps-error' || locationState === 'radius-error' || (radius && !radius.inRadius) ? 'border-destructive/30 bg-destructive/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-semibold">
                    {locationReady
                      ? 'Di dalam radius'
                      : radius && !radius.inRadius
                        ? 'Di luar radius'
                        : locationState === 'radius-error'
                          ? 'Pemeriksaan radius gagal'
                          : locationState === 'gps-error'
                            ? 'Lokasi gagal'
                            : locationState === 'checking'
                              ? 'Memeriksa radius'
                              : 'Meningkatkan akurasi'}
                  </span>
                </div>
              </div>
            </section>

            <div aria-live="polite" className={`rounded-lg border p-3 text-sm ${locationReady ? 'border-emerald-500/20 bg-emerald-500/5' : locationState === 'gps-error' || locationState === 'radius-error' || (radius && !radius.inRadius) ? 'border-destructive/20 bg-destructive/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                {locationState === 'acquiring' || locationState === 'checking' ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-600" /> : <LocateFixed className="mt-0.5 h-4 w-4 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {locationState === 'acquiring'
                      ? `Meningkatkan akurasi GPS${location?.accuracy !== null && location?.accuracy !== undefined ? `… ±${location.accuracy} m` : '…'}`
                      : locationState === 'checking'
                        ? 'Koordinat ditemukan, memeriksa radius…'
                        : radius?.message || locationError || 'Lokasi ditemukan'}
                  </p>
                  {location && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Akurasi GPS ±{location.accuracy ?? '-'} m
                      {radius ? ` · Jarak ${radius.distanceMeters} m / radius ${radius.radiusMeters} m` : ''}
                    </p>
                  )}
                  {location?.accuracy !== null &&
                    location?.accuracy !== undefined &&
                    configuredRadius !== null &&
                    location.accuracy > configuredRadius && (
                      <p className="mt-2 text-xs leading-relaxed text-amber-700">
                        Akurasi GPS (±{location.accuracy} m) lebih lebar dari radius {configuredRadius} m. Pindah mendekati jendela atau area terbuka, lalu perbarui GPS. Radius server tidak akan diperlonggar.
                      </p>
                    )}
                </div>
                </div>
                <button
                  type="button"
                  onClick={() => refreshLocation(true)}
                  disabled={locationState === 'acquiring' || locationState === 'checking'}
                  aria-label="Perbarui lokasi GPS"
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-semibold shadow-sm transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${locationState === 'acquiring' || locationState === 'checking' ? 'animate-spin' : ''}`} />
                  Perbarui GPS
                </button>
              </div>
            </div>

            {!canSubmit && disabledReason && (
              <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {disabledReason}
              </p>
            )}

            <button
              type="button"
              onClick={handleAttendance}
              disabled={!canSubmit}
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-lg px-4 font-bold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                status?.isCheckedIn
                  ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                  : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
              }`}
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              {isSubmitting ? 'Memproses absensi...' : status?.isCheckedIn ? 'Check Out Sekarang' : 'Check In Sekarang'}
            </button>

            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              Foto hanya merekam selfie dari kamera perangkat; fitur ini tidak melakukan verifikasi identitas atau liveness.
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
