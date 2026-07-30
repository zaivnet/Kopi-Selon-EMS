import { useEffect } from 'react';
import { X } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';

const schema = z.object({
  name: z.string().min(1, 'Nama Shift wajib diisi'),
  startTime: z.string().min(1, 'Waktu Mulai wajib diisi'),
  endTime: z.string().min(1, 'Waktu Selesai wajib diisi'),
});

type FormData = z.infer<typeof schema>;

export default function ShiftFormModal({ shift, onClose, onSuccess }: { shift: any, onClose: () => void, onSuccess: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (shift) {
      reset({
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
      });
    }
  }, [shift, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (shift) {
        await api.put(`/shifts/${shift.id}`, data);
      } else {
        await api.post('/shifts', data);
      }
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan data');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{shift ? 'Edit Shift' : 'Tambah Shift'}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nama Shift *</label>
            <input {...register('name')} placeholder="Misal: Shift Pagi" className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Waktu Mulai *</label>
              <input type="time" {...register('startTime')} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              {errors.startTime && <p className="text-xs text-destructive mt-1">{errors.startTime.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Waktu Selesai *</label>
              <input type="time" {...register('endTime')} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              {errors.endTime && <p className="text-xs text-destructive mt-1">{errors.endTime.message}</p>}
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
