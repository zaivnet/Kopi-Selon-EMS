import { useState, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import api from '@/lib/api';

export default function PhotoUploadModal({ employee, onClose, onSuccess }: { employee: any, onClose: () => void, onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    setIsLoading(true);
    try {
      await api.post(`/employees/${employee.id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSuccess();
    } catch (err) {
      alert('Gagal upload foto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-lg border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Upload Foto</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="h-24 w-24 rounded-full bg-secondary overflow-hidden border">
            {employee.photoUrl ? (
              <img src={employee.photoUrl} alt={employee.firstName} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-secondary-foreground text-xl font-bold">
                {employee.firstName.charAt(0)}
              </div>
            )}
          </div>
          
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isLoading ? 'Mengupload...' : 'Pilih Foto'}
          </button>
        </div>
      </div>
    </div>
  );
}
