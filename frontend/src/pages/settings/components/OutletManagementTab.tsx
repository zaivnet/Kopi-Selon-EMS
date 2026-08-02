import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Edit, Trash2, Crosshair, LoaderCircle, Store, Compass } from 'lucide-react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, Button } from '@/components/ui/design-system';

interface Outlet {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  latitude: number;
  longitude: number;
  radius: number;
  isActive: boolean;
  _count?: {
    employees: number;
    workSchedules: number;
  };
}

function LocationPicker({ lat, lng, radius, onChange, myLocation }: { lat: number; lng: number; radius: number; onChange: (lat: number, lng: number) => void; myLocation?: { lat: number; lng: number } | null }) {
  const map = useMap();

  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    }
  });

  const userLocationIcon = useMemo(() => L.divIcon({
    html: '<div style="background:#2563eb;color:white;border-radius:9999px;padding:4px 8px;font-size:10px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.2);">Saya</div>',
    className: '',
    iconSize: [48, 24],
    iconAnchor: [24, 12],
  }), []);

  return (
    <>
      <Marker position={[lat, lng]} />
      <Circle center={[lat, lng]} radius={radius} pathOptions={{ color: '#d97706', fillColor: '#f59e0b', fillOpacity: 0.25 }} />
      {myLocation && (
        <>
          <Marker position={[myLocation.lat, myLocation.lng]} icon={userLocationIcon} />
          <Circle center={[myLocation.lat, myLocation.lng]} radius={40} pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.12 }} />
        </>
      )}
    </>
  );
}

export default function OutletManagementTab({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [latitude, setLatitude] = useState(-6.200000);
  const [longitude, setLongitude] = useState(106.816666);
  const [radius, setRadius] = useState(100);
  const [isActive, setIsActive] = useState(true);

  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [isLocating, setIsLocating] = useState(false);
  const [isLocatingMe, setIsLocatingMe] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { data: outletsData, isLoading } = useQuery<Outlet[]>({
    queryKey: ['outletsList'],
    queryFn: async () => {
      try {
        const res = await api.get('/outlets');
        return Array.isArray(res.data) ? res.data : [];
      } catch (err) {
        console.warn('Gagal memuat outlet list:', err);
        return [];
      }
    }
  });
  const outlets = Array.isArray(outletsData) ? outletsData : [];

  const openCreateModal = () => {
    setEditingOutlet(null);
    setCode(`SELON-${outlets.length + 1}`);
    setName(`Selon ${outlets.length + 1} - Cabang Baru`);
    setAddress('');
    setPhone('');
    setLatitude(-6.200000);
    setLongitude(106.816666);
    setRadius(100);
    setIsActive(true);
    setMsg({ text: '', type: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setCode(outlet.code);
    setName(outlet.name);
    setAddress(outlet.address || '');
    setPhone(outlet.phone || '');
    setLatitude(outlet.latitude);
    setLongitude(outlet.longitude);
    setRadius(outlet.radius);
    setIsActive(outlet.isActive);
    setMsg({ text: '', type: '' });
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { code, name, address, phone, latitude, longitude, radius, isActive };
      if (editingOutlet) {
        return (await api.put(`/outlets/${editingOutlet.id}`, payload)).data;
      } else {
        return (await api.post('/outlets', payload)).data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outletsList'] });
      setMsg({ text: editingOutlet ? 'Cabang berhasil diperbarui.' : 'Cabang baru berhasil ditambahkan.', type: 'success' });
      setTimeout(() => {
        setIsModalOpen(false);
        setMsg({ text: '', type: '' });
      }, 1200);
    },
    onError: (err: any) => {
      setMsg({ text: err.response?.data?.message || 'Gagal menyimpan data cabang.', type: 'error' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.delete(`/outlets/${id}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outletsList'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Gagal menghapus cabang.');
    }
  });

  const getCurrentGPSLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung Geolocation GPS.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('Lokasi outlet berhasil diambil:', pos.coords.latitude, pos.coords.longitude);
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      (err) => {
        console.error('Geolocation error:', err.code, err.message);
        const errorMsg = err.code === 1 ? 'Izin akses lokasi ditolak. Silakan berikan izin di pengaturan browser.' :
                         err.code === 2 ? 'Lokasi tidak dapat ditentukan.' :
                         err.code === 3 ? 'Waktu tunggu geolocation habis.' :
                         err.message;
        alert(`Gagal mengambil koordinat lokasi saat ini: ${errorMsg}`);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const getMyCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung Geolocation GPS.');
      return;
    }
    setIsLocatingMe(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('Lokasi berhasil diambil:', pos.coords.latitude, pos.coords.longitude);
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocatingMe(false);
      },
      (err) => {
        console.error('Geolocation error:', err.code, err.message);
        const errorMsg = err.code === 1 ? 'Izin akses lokasi ditolak. Silakan berikan izin di pengaturan browser.' :
                         err.code === 2 ? 'Lokasi tidak dapat ditentukan.' :
                         err.code === 3 ? 'Waktu tunggu geolocation habis.' :
                         err.message;
        alert(`Gagal mengambil lokasi Anda: ${errorMsg}`);
        setIsLocatingMe(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const getDistanceFromMyLocation = (outlet: Outlet) => {
    if (!myLocation) return null;

    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadius = 6371000;
    const dLat = toRad(outlet.latitude - myLocation.lat);
    const dLng = toRad(outlet.longitude - myLocation.lng);
    const lat1 = toRad(myLocation.lat);
    const lat2 = toRad(outlet.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(earthRadius * c);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-amber-100 flex items-center gap-2">
            <Store className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Manajemen Outlet Cabang (Selon 1 & Selon 2)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kelola koordinat GPS warkop cabang, alamat, dan radius geofencing presensi karyawan.
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreateModal} className="inline-flex items-center gap-1.5 self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            <span>Tambah Cabang Baru</span>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-slate-500">Memuat data cabang outlet...</div>
      ) : outlets.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
          Belum ada cabang outlet terdaftar. Klik tombol Tambah Cabang Baru untuk memulai.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {outlets.map((outlet) => (
            <Card key={outlet.id} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={outlet.isActive ? 'success' : 'neutral'}>
                        {outlet.code}
                      </Badge>
                      <CardTitle className="text-base">{outlet.name}</CardTitle>
                    </div>
                    {outlet.address && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                        <span>{outlet.address}</span>
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(outlet)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:bg-amber-500/20"
                        title="Edit Cabang"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Yakin ingin menghapus cabang ${outlet.name}?`)) {
                            deleteMutation.mutate(outlet.id);
                          }
                        }}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-600 dark:hover:bg-red-500/20"
                        title="Hapus Cabang"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-2 text-xs">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-amber-500/10 p-2.5 dark:bg-amber-500/10">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-amber-200/70">Radius Geofencing</span>
                    <p className="font-extrabold text-amber-900 dark:text-amber-200">{outlet.radius} meter</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-amber-200/70">Karyawan Terdaftar</span>
                    <p className="font-extrabold text-amber-900 dark:text-amber-200">{outlet._count?.employees || 0} orang</p>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Lat: {outlet.latitude.toFixed(6)}, Lng: {outlet.longitude.toFixed(6)}
                </div>
                {myLocation && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <Compass className="h-3.5 w-3.5 text-amber-600" />
                    <span>Jarak dari lokasi Anda: {getDistanceFromMyLocation(outlet)} m</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Form Tambah/Edit Cabang */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-[#1a120c] sm:p-7 border border-amber-500/20">
            <div className="flex items-center justify-between border-b pb-3 dark:border-amber-900/40">
              <h3 className="text-lg font-bold text-slate-900 dark:text-amber-100 flex items-center gap-2">
                <Store className="h-5 w-5 text-amber-600" />
                {editingOutlet ? `Edit Cabang (${editingOutlet.code})` : 'Tambah Cabang Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {msg.text && (
              <div className={`mt-4 rounded-xl p-3 text-xs font-semibold ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/10 text-red-700 dark:text-red-300'}`}>
                {msg.text}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-amber-200">Kode Cabang</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="SELON-1"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-amber-200">Nama Cabang</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Menurut Lokasi (misal: Selon 1 - Merdeka)"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-100"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-amber-200">Alamat Lengkap</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Jl. Kopi Selon No. 1..."
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-amber-200">No. Telepon Outlet</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08123456789"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-amber-200">Koordinat GPS Titik Pusat Absensi</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={getMyCurrentLocation}
                      disabled={isLocatingMe}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {isLocatingMe ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Compass className="h-3 w-3" />}
                      <span>Gunakan Lokasi Saya</span>
                    </button>
                    <button
                      type="button"
                      onClick={getCurrentGPSLocation}
                      disabled={isLocating}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:underline dark:text-amber-400"
                    >
                      {isLocating ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Crosshair className="h-3 w-3" />}
                      <span>Gunakan GPS Perangkat Saat Ini</span>
                    </button>
                  </div>
                </div>

                <div className="h-56 w-full overflow-hidden rounded-2xl border border-slate-300 dark:border-slate-700">
                  <MapContainer center={[latitude, longitude]} zoom={15} className="h-full w-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationPicker
                      lat={latitude}
                      lng={longitude}
                      radius={radius}
                      myLocation={myLocation}
                      onChange={(l1, l2) => { setLatitude(l1); setLongitude(l2); }}
                    />
                  </MapContainer>
                </div>
                {myLocation && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
                    Lokasi Anda saat ini: {myLocation.lat.toFixed(6)}, {myLocation.lng.toFixed(6)}. Marker biru menandai posisi Anda, marker jingga adalah pusat outlet.
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-amber-200">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-amber-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-amber-200">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-amber-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-amber-200">Radius Absensi (meter)</label>
                  <input
                    type="number"
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-amber-100"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-4 dark:border-amber-900/40">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-amber-200">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Status Cabang Aktif</span>
                </label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Cabang'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
