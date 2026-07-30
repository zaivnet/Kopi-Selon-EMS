import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, MapPin, Phone, Mail, Clock, Map, Image as ImageIcon, CheckCircle, Upload } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';

const schema = z.object({
  name: z.string().min(1, 'Nama Usaha harus diisi'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  hours: z.string().optional(),
  about: z.string().optional(),
  mapsLink: z.string().url('Format URL tidak valid').optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export default function CompanyProfilePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Administrator';
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['companyProfile'],
    queryFn: async () => {
      const res = await api.get('/company');
      return res.data;
    }
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      email: '',
      hours: '24 Jam',
      about: '',
      mapsLink: ''
    }
  });

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || '',
        address: profile.address || '',
        phone: profile.phone || '',
        email: profile.email || '',
        hours: profile.hours || '24 Jam',
        about: profile.about || '',
        mapsLink: profile.mapsLink || ''
      });
      if (profile.logoUrl) {
        setLogoPreview(`http://localhost:3000${profile.logoUrl}`);
      }
    }
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      const res = await api.put('/company', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyProfile'] });
      setIsEditing(false);
      setSuccessMsg('Profil perusahaan berhasil disimpan');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Memuat profil perusahaan...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profil Perusahaan</h1>
          <p className="text-muted-foreground">Kelola informasi publik dan detail operasional usaha Anda.</p>
        </div>
        {isAdmin && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md shadow hover:bg-primary/90 transition-colors font-medium"
          >
            Edit Profil
          </button>
        )}
      </div>

      {successMsg && (
        <div className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 p-4 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {!isEditing ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <div className="w-40 h-40 rounded-full border-4 border-muted overflow-hidden bg-background mb-4 flex items-center justify-center">
                  {profile?.logoUrl ? (
                    <img src={`http://localhost:3000${profile.logoUrl}`} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-16 h-16 text-muted-foreground opacity-50" />
                  )}
                </div>
                <h2 className="text-2xl font-bold">{profile?.name}</h2>
                <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{profile?.hours || 'Belum diatur'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kontak & Lokasi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Alamat</p>
                    <p className="text-sm text-muted-foreground">{profile?.address || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Telepon</p>
                    <p className="text-sm text-muted-foreground">{profile?.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Email</p>
                    <p className="text-sm text-muted-foreground">{profile?.email || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tentang Perusahaan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {profile?.about || 'Belum ada deskripsi.'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Map className="w-5 h-5" /> Lokasi Maps
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile?.mapsLink ? (
                  <div className="aspect-video w-full rounded-lg overflow-hidden border border-border">
                    <iframe
                      src={profile.mapsLink}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground bg-muted/20">
                    Tidak ada link Google Maps yang diatur
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Edit Profil Perusahaan</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Ubah detail informasi perusahaan. Kosongkan jika tidak perlu.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="flex flex-col items-center sm:items-start gap-4">
                <label className="block text-sm font-medium mb-2">Logo Perusahaan</label>
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 rounded-full border-2 border-dashed border-border overflow-hidden bg-muted/30 flex items-center justify-center shrink-0">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground opacity-50" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                    <label
                      htmlFor="logo-upload"
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors text-sm font-medium"
                    >
                      <Upload className="w-4 h-4" /> Pilih Gambar
                    </label>
                    <p className="text-xs text-muted-foreground mt-2">Disarankan ukuran 1:1 (persegi).</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nama Usaha <span className="text-destructive">*</span></label>
                  <input
                    {...register('name')}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Jam Operasional</label>
                  <input
                    {...register('hours')}
                    placeholder="e.g. 24 Jam, atau 08:00 - 22:00"
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Alamat</label>
                  <textarea
                    {...register('address')}
                    rows={2}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Nomor HP / WhatsApp</label>
                  <input
                    {...register('phone')}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <input
                    {...register('email')}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Link Google Maps (URL iframe src)</label>
                  <input
                    {...register('mapsLink')}
                    placeholder="https://www.google.com/maps/embed?pb=..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {errors.mapsLink && <p className="text-sm text-destructive">{errors.mapsLink.message}</p>}
                  <p className="text-xs text-muted-foreground mt-1">Copy URL dari 'src' attribute saat Share &gt; Embed a map di Google Maps.</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Tentang Perusahaan</label>
                  <textarea
                    {...register('about')}
                    rows={5}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-border text-foreground bg-background rounded-md hover:bg-accent transition-colors font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md shadow hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
                >
                  {mutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
