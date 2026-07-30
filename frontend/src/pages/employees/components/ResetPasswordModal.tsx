import { useState } from 'react';
import { X } from 'lucide-react';
import api from '@/lib/api';

export default function ResetPasswordModal({ employee, onClose }: { employee: any, onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setIsLoading(true);
    try {
      await api.post(`/employees/${employee.id}/reset-password`, { newPassword: password });
      alert('Password berhasil direset');
      onClose();
    } catch (err) {
      alert('Gagal reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-lg border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Reset Password</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Password Baru untuk {employee.firstName}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-accent">Batal</button>
            <button type="submit" disabled={isLoading} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">{isLoading ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
