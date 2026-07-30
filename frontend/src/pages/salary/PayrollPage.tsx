import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calculator, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';

export default function PayrollPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());

  const { data: histories = [], isLoading } = useQuery({
    queryKey: ['payrollHistory'],
    queryFn: async () => {
      const res = await api.get('/payroll/history');
      return res.data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/payroll/generate', data);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['payrollHistory'] });
      alert(res.message + ` (${res.count} data baru)`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Gagal menghitung gaji');
    }
  });

  const handleGenerate = () => {
    if (confirm(`Hitung gaji untuk periode ${periodMonth}/${periodYear}? Sistem akan menggunakan aturan gaji aktif saat ini.`)) {
      mutation.mutate({ periodMonth: Number(periodMonth), periodYear: Number(periodYear) });
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  if (!hasPermission('salary.view')) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Penggajian (Payroll)</h1>
          <p className="text-muted-foreground">Hitung gaji otomatis berdasarkan absensi dan aturan gaji aktif.</p>
        </div>
      </div>

      {hasPermission('salary.calculate') && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Payroll Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 max-w-lg">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Bulan</label>
                <select value={periodMonth} onChange={e => setPeriodMonth(Number(e.target.value))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  {[...Array(12)].map((_, i) => (
                    <option key={i+1} value={i+1}>{i+1}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Tahun</label>
                <input type="number" value={periodYear} onChange={e => setPeriodYear(Number(e.target.value))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
              </div>
              <button 
                onClick={handleGenerate}
                disabled={mutation.isPending}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2 shrink-0"
              >
                <Calculator className="mr-2 h-4 w-4" />
                {mutation.isPending ? 'Menghitung...' : 'Hitung Gaji'}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histori Penggajian</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : histories.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground border border-dashed rounded-lg">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada histori penggajian.</p>
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Periode</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Karyawan</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Gaji Pokok</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Potongan</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Total Diterima</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {histories.map((hist: any) => (
                    <tr key={hist.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle font-medium">{hist.periodMonth}/{hist.periodYear}</td>
                      <td className="p-4 align-middle">
                        {hist.employee.firstName} {hist.employee.lastName}
                        <div className="text-xs text-muted-foreground">{hist.employee.position}</div>
                      </td>
                      <td className="p-4 align-middle">{formatCurrency(hist.baseSalary)}</td>
                      <td className="p-4 align-middle">
                        <div className="text-destructive font-medium">{formatCurrency(hist.totalDeduction)}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {hist.deductions?.map((d: any) => <div key={d.id}>- {d.name}</div>)}
                        </div>
                      </td>
                      <td className="p-4 align-middle font-bold text-emerald-600">{formatCurrency(hist.netSalary)}</td>
                      <td className="p-4 align-middle">
                        {hist.status === 'PAID' ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/20">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Lunas
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-500 ring-1 ring-inset ring-amber-500/20">
                            <AlertCircle className="mr-1 h-3 w-3" /> Tertunda
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
