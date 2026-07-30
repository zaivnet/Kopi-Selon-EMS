import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm as useReactHookForm } from 'react-hook-form';
import api from '@/lib/api';

const schema = z.object({
  name: z.string().min(1, 'Nama Karyawan wajib diisi'),
  gender: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  baseSalary: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  roleId: z.string().min(1, 'Role wajib diisi'),
});

type FormData = z.infer<typeof schema>;

export default function EmployeeFormModal({ employee, onClose, onSuccess }: { employee: any, onClose: () => void, onSuccess: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useReactHookForm<FormData>({
    resolver: zodResolver(schema),
  });

  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await api.get('/roles');
        setRoles(res.data);
      } catch (err) {
        console.warn('Failed to fetch roles');
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    if (employee) {
      const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
      reset({
        name: fullName,
        gender: employee.gender || '',
        phone: employee.phone || '',
        address: employee.address || '',
        baseSalary: employee.baseSalary?.toString() || '',
        username: employee.user?.username || '',
        roleId: employee.user?.roleId || '',
        password: '', 
      });
    }
  }, [employee, reset]);

  const onSubmit = async (data: FormData) => {
    if (!employee) {
      if (!data.username || data.username.trim().length < 3) {
        alert('Username minimal 3 karakter');
        return;
      }
      if (!data.password || data.password.length < 6) {
        alert('Password minimal 6 karakter');
        return;
      }
    }

    try {
      if (employee) {
        const payload = { ...data };
        if (!payload.password) delete payload.password;
        await api.put(`/employees/${employee.id}`, payload);
      } else {
        await api.post('/employees', data);
      }
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan data');
    }
  };

  const getRoleDisplayName = (roleName: string) => {
    if (roleName === 'Administrator') return 'Admin';
    return roleName;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-card p-6 shadow-lg border">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-card z-10 pb-2 border-b">
          <h2 className="text-xl font-semibold">{employee ? 'Edit Karyawan' : 'Tambah Karyawan'}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-full border-b pb-2 mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Akun Pengguna</h3>
            </div>
            
            <div>
              <label className="text-sm font-medium">Username {employee ? '' : '*'}</label>
              <input 
                {...register('username')} 
                disabled={!!employee} 
                placeholder="Masukkan username"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50" 
              />
              {errors.username && <p className="text-xs text-destructive mt-1">{errors.username.message}</p>}
            </div>

            {!employee && (
              <div>
                <label className="text-sm font-medium">Password *</label>
                <input 
                  type="password" 
                  {...register('password')} 
                  placeholder="Masukkan password"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                />
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Role *</label>
              <select {...register('roleId')} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">Pilih Role</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{getRoleDisplayName(role.name)}</option>
                ))}
              </select>
              {errors.roleId && <p className="text-xs text-destructive mt-1">{errors.roleId.message}</p>}
            </div>

            <div className="col-span-full border-b pb-2 mb-2 mt-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Data Karyawan</h3>
            </div>

            <div className="col-span-full">
              <label className="text-sm font-medium">Nama Karyawan *</label>
              <input 
                {...register('name')} 
                placeholder="Masukkan nama lengkap karyawan"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">Jenis Kelamin</label>
              <select {...register('gender')} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">Pilih Jenis Kelamin</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Nomor HP</label>
              <input 
                {...register('phone')} 
                placeholder="08123456789"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
              />
            </div>

            <div>
              <label className="text-sm font-medium">Gaji Pokok</label>
              <input 
                type="number" 
                {...register('baseSalary')} 
                placeholder="Nominal gaji pokok"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
              />
            </div>

            <div className="col-span-full">
              <label className="text-sm font-medium">Alamat</label>
              <textarea 
                {...register('address')} 
                rows={3} 
                placeholder="Alamat lengkap"
                className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              ></textarea>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-accent">Batal</button>
            <button type="submit" disabled={isSubmitting} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">{isSubmitting ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
