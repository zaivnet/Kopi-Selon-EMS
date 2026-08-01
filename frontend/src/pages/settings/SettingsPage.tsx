import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MapPin, Settings as SettingsIcon, Database, Moon, Sun, 
  History, Save, HardDriveDownload, HardDriveUpload, Clock, Calculator,
  Crosshair, LoaderCircle
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/AuthContext';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import dayjs from 'dayjs';

// Fix leaflet icon issue
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function SettingsPage() {
  const { hasPermission } = useAuth();
  const canEditSettings = hasPermission('settings.edit');
  const canViewAuditLog = hasPermission('audit_log.view');
  const canUseBackup = hasPermission('backup_restore.backup');
  const [activeTab, setActiveTab] = useState(canEditSettings ? 'location' : 'appearance');
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pengaturan Sistem</h1>
        <p className="text-muted-foreground">Kelola konfigurasi, lokasi absensi, database, dan log aktivitas.</p>
      </div>

      <div className="flex overflow-x-auto space-x-2 border-b border-border pb-px">
        {[
          { id: 'location', label: 'Lokasi & Absensi', icon: MapPin, visible: canEditSettings },
          { id: 'salary', label: 'Toleransi & Potongan', icon: Calculator, visible: canEditSettings },
          { id: 'appearance', label: 'Tampilan', icon: Sun, visible: true },
          { id: 'database', label: 'Backup & Restore', icon: Database, visible: canUseBackup },
          { id: 'audit', label: 'Audit Log', icon: History, visible: canViewAuditLog },
        ].filter(tab => tab.visible).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-primary text-primary font-medium' 
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === 'location' && <LocationTab />}
        {activeTab === 'salary' && <SalaryTab />}
        {activeTab === 'appearance' && (
          <AppearanceTab theme={theme} setTheme={setTheme} />
        )}
        {activeTab === 'database' && <DatabaseTab />}
        {activeTab === 'audit' && <AuditLogTab />}
      </div>
    </div>
  );
}

function LocationMapEvents({ setPosition }: { setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function LocationMapRecenter({
  position,
  requestKey
}: {
  position: [number, number];
  requestKey: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (requestKey > 0) {
      map.flyTo(position, 18, { duration: 1.25 });
    }
  }, [map, position, requestKey]);

  return null;
}

function LocationTab() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [position, setPosition] = useState<[number, number]>([-7.1643, 113.4800]); // Pamekasan default
  const [radius, setRadius] = useState(50);
  const [msg, setMsg] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationRequestKey, setLocationRequestKey] = useState(0);
  const [locationStatus, setLocationStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const { data: loc, isLoading } = useQuery({
    queryKey: ['locationSetting'],
    queryFn: async () => {
      const res = await api.get('/settings/location');
      return res.data;
    }
  });

  useEffect(() => {
    if (loc) {
      setName(loc.name);
      setPosition([loc.latitude, loc.longitude]);
      setRadius(loc.radius);
    }
  }, [loc]);

  const mutation = useMutation({
    mutationFn: async () => {
      await api.put('/settings/location', {
        name,
        latitude: position[0],
        longitude: position[1],
        radius
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locationSetting'] });
      setMsg('Pengaturan lokasi berhasil disimpan.');
      setTimeout(() => setMsg(''), 3000);
    }
  });

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus({
        type: 'error',
        text: 'Browser ini tidak mendukung deteksi lokasi. Klik peta untuk menentukan lokasi secara manual.'
      });
      return;
    }

    setIsLocating(true);
    setLocationStatus(null);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition([coords.latitude, coords.longitude]);
        setLocationRequestKey(key => key + 1);
        setLocationStatus({
          type: 'success',
          text: 'Lokasi berhasil ditemukan. Periksa titik di peta, lalu tekan Simpan Pengaturan.'
        });
        setIsLocating(false);
      },
      error => {
        const errorMessages: Record<number, string> = {
          [error.PERMISSION_DENIED]: 'Izin lokasi ditolak. Izinkan akses lokasi di pengaturan browser, lalu coba lagi.',
          [error.POSITION_UNAVAILABLE]: 'Lokasi perangkat belum tersedia. Pastikan layanan lokasi aktif, lalu coba lagi.',
          [error.TIMEOUT]: 'Pencarian lokasi terlalu lama. Periksa GPS atau koneksi perangkat, lalu coba lagi.'
        };

        setLocationStatus({
          type: 'error',
          text: errorMessages[error.code] || 'Lokasi tidak dapat dideteksi. Silakan coba lagi atau pilih titik pada peta.'
        });
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000
      }
    );
  };

  if (isLoading) return <p>Memuat lokasi...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lokasi Warkop & Radius Absensi</CardTitle>
        <p className="text-sm text-muted-foreground">Tentukan lokasi titik pusat Warkop dan radius maksimal (dalam meter) agar karyawan bisa absen.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {msg && <p className="text-emerald-500 font-medium bg-emerald-500/10 p-3 rounded-md">{msg}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nama Lokasi</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Radius Absensi (meter)</label>
              <input 
                type="number" 
                value={radius} 
                onChange={e => setRadius(Number(e.target.value))} 
                className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Latitude</label>
                <input 
                  type="text" 
                  value={position[0].toFixed(6)} 
                  readOnly
                  className="w-full px-3 py-2 border rounded-md bg-muted text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Longitude</label>
                <input 
                  type="text" 
                  value={position[1].toFixed(6)} 
                  readOnly
                  className="w-full px-3 py-2 border rounded-md bg-muted text-muted-foreground"
                />
              </div>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={isLocating}
                className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 border border-border bg-background text-foreground font-medium rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              >
                {isLocating ? (
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                ) : (
                  <Crosshair className="w-4 h-4" />
                )}
                {isLocating ? 'Mendeteksi lokasi...' : 'Gunakan Lokasi Saya'}
              </button>

              {locationStatus && (
                <p
                  role={locationStatus.type === 'error' ? 'alert' : 'status'}
                  className={`text-sm font-medium p-3 rounded-md ${
                    locationStatus.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {locationStatus.text}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => mutation.mutate()} 
              disabled={mutation.isPending}
              className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="w-4 h-4" /> {mutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
          
          <div className="h-[400px] border rounded-md overflow-hidden relative z-0">
            {position && (
              <MapContainer center={position} zoom={16} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={position} />
                <Circle center={position} radius={radius} pathOptions={{ color: 'hsl(var(--primary))', fillColor: 'hsl(var(--primary))' }} />
                <LocationMapEvents setPosition={pos => {
                  setPosition(pos);
                  setLocationStatus(null);
                }} />
                <LocationMapRecenter position={position} requestKey={locationRequestKey} />
              </MapContainer>
            )}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-background/90 px-3 py-1 rounded-full shadow-sm text-xs font-medium border">
              Klik peta untuk mengubah lokasi
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SalaryTab() {
  const queryClient = useQueryClient();
  const [tolerance, setTolerance] = useState('15');
  const [absent, setAbsent] = useState('0');
  const [late, setLate] = useState('0');
  const [underwork, setUnderwork] = useState('0');
  const [msg, setMsg] = useState('');

  const { data: _general } = useQuery({
    queryKey: ['generalSettings'],
    queryFn: async () => {
      const res = await api.get('/settings/general');
      const tol = res.data.find((s: any) => s.key === 'LATE_TOLERANCE_MINUTES');
      if (tol) setTolerance(tol.value);
      return res.data;
    }
  });

  const { data: _rules } = useQuery({
    queryKey: ['activeSalaryRuleSetting'],
    queryFn: async () => {
      const res = await api.get('/salary-rules/active');
      setAbsent(res.data.absentDeduction);
      setLate(res.data.lateDeductionPerMinute);
      setUnderwork(res.data.underworkDeductionPerHour);
      return res.data;
    }
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await api.put('/settings/general', { LATE_TOLERANCE_MINUTES: tolerance });
      await api.post('/salary-rules', {
        absentDeduction: Number(absent),
        lateDeductionPerMinute: Number(late),
        underworkDeductionPerHour: Number(underwork),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generalSettings'] });
      queryClient.invalidateQueries({ queryKey: ['activeSalaryRuleSetting'] });
      setMsg('Pengaturan toleransi & potongan berhasil disimpan.');
      setTimeout(() => setMsg(''), 3000);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jam Toleransi & Potongan Gaji</CardTitle>
        <p className="text-sm text-muted-foreground">Atur toleransi keterlambatan dan nominal pemotongan jika melanggar.</p>
      </CardHeader>
      <CardContent className="space-y-6 max-w-xl">
        {msg && <p className="text-emerald-500 font-medium bg-emerald-500/10 p-3 rounded-md">{msg}</p>}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Jam Toleransi Keterlambatan (Menit)</label>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <input 
                type="number" 
                value={tolerance} 
                onChange={e => setTolerance(e.target.value)} 
                className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Karyawan tidak akan dihitung terlambat jika masuk dalam batas menit ini setelah jam masuk.</p>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Calculator className="w-4 h-4" /> Potongan Gaji</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Potongan Tidak Masuk / Alpha (Rp per Hari)</label>
                <input 
                  type="number" 
                  value={absent} 
                  onChange={e => setAbsent(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Potongan Terlambat (Rp per Menit)</label>
                <input 
                  type="number" 
                  value={late} 
                  onChange={e => setLate(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Potongan Kurang Jam Kerja (Rp per Jam)</label>
                <input 
                  type="number" 
                  value={underwork} 
                  onChange={e => setUnderwork(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <button 
            onClick={() => mutation.mutate()} 
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 mt-4"
          >
            <Save className="w-4 h-4" /> Simpan Pengaturan
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function AppearanceTab({ theme, setTheme }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tampilan Sistem</CardTitle>
        <p className="text-sm text-muted-foreground">Pilih tema warna aplikasi sesuai kenyamanan Anda.</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
          <button
            onClick={() => setTheme('light')}
            className={`p-4 border rounded-xl flex flex-col items-center gap-3 transition-all ${theme === 'light' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:border-foreground/20 hover:bg-accent'}`}
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-800">
              <Sun className="w-6 h-6" />
            </div>
            <span className="font-medium">Light Mode</span>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-4 border rounded-xl flex flex-col items-center gap-3 transition-all ${theme === 'dark' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:border-foreground/20 hover:bg-accent'}`}
          >
            <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-slate-100">
              <Moon className="w-6 h-6" />
            </div>
            <span className="font-medium">Dark Mode</span>
          </button>

          <button
            onClick={() => setTheme('system')}
            className={`p-4 border rounded-xl flex flex-col items-center gap-3 transition-all ${theme === 'system' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:border-foreground/20 hover:bg-accent'}`}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-200 to-slate-800 flex items-center justify-center text-white">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <span className="font-medium">Sesuai Sistem</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function DatabaseTab() {
  const [file, setFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

    const handleBackup = async () => {
    try {
      setMsg({ text: 'Mengunduh backup...', type: 'success' });
      const response = await api.get('/database/backup', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'backup_kopi_selon.db');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      setMsg({ text: 'Backup berhasil diunduh.', type: 'success' });
      setTimeout(() => setMsg({ text: '', type: '' }), 3000);
    } catch (error) {
      setMsg({ text: 'Gagal mengunduh backup database.', type: 'error' });
    }
  };

  const handleRestore = async () => {
    if (!file) return;
    if (!confirm('Peringatan: Restore akan menimpa seluruh data saat ini! Lanjutkan?')) return;
    
    setIsRestoring(true);
    const formData = new FormData();
    formData.append('database', file);
    
    try {
      await api.post('/database/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMsg({ text: 'Database berhasil direstore. Halaman akan direfresh...', type: 'success' });
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      setMsg({ text: 'Gagal merestore database.', type: 'error' });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup & Restore Database</CardTitle>
        <p className="text-sm text-muted-foreground">Amankan data sistem dengan melakukan backup berkala atau pulihkan dari file backup.</p>
      </CardHeader>
      <CardContent className="space-y-8">
        
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <HardDriveDownload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">Backup Data</h3>
              <p className="text-sm text-muted-foreground">Download file database (.db) ke perangkat Anda.</p>
            </div>
          </div>
          <button 
            onClick={handleBackup}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-md hover:bg-secondary/80"
          >
            <HardDriveDownload className="w-4 h-4" /> Download Backup
          </button>
        </div>

        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
              <HardDriveUpload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-destructive">Restore Data</h3>
              <p className="text-sm text-muted-foreground">Unggah file backup (.db) untuk memulihkan data. <span className="font-bold">Aksi ini akan menimpa data yang ada!</span></p>
            </div>
          </div>
          
          <div className="flex items-end gap-4 max-w-lg">
            <div className="flex-1">
              <input 
                type="file" 
                accept=".db"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-destructive/30 rounded-md bg-background focus:outline-none"
              />
            </div>
            <button 
              onClick={handleRestore}
              disabled={!file || isRestoring}
              className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground font-medium rounded-md hover:bg-destructive/90 disabled:opacity-50"
            >
              <HardDriveUpload className="w-4 h-4" /> {isRestoring ? 'Memulihkan...' : 'Restore'}
            </button>
          </div>
          {msg.text && (
            <p className={`text-sm p-3 rounded-md ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
              {msg.text}
            </p>
          )}
        </div>

      </CardContent>
    </Card>
  );
}

function AuditLogTab() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const res = await api.get('/logs');
      return res.data;
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
        <p className="text-sm text-muted-foreground">Catatan aktivitas penting dalam sistem untuk keperluan keamanan.</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Memuat logs...</div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Waktu</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Aksi</th>
                    <th className="px-4 py-3 font-medium">Entitas</th>
                    <th className="px-4 py-3 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                        Belum ada log aktivitas.
                      </td>
                    </tr>
                  ) : logs?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 whitespace-nowrap">{dayjs(log.createdAt).format('DD MMM YYYY, HH:mm')}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{log.user?.username || 'Sistem'}</div>
                        <div className="text-xs text-muted-foreground">{log.ipAddress || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full border ${
                          log.action === 'LOGIN' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 
                          log.action === 'CREATE' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                          log.action === 'UPDATE' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                          log.action === 'DELETE' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                          'bg-secondary text-secondary-foreground'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.entity}</td>
                      <td className="px-4 py-3 text-muted-foreground">{log.details || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
