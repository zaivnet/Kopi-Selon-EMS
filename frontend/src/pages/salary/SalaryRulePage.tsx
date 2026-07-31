import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, History, Clock, Calculator, AlertCircle, Receipt, Sparkles, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, Button, Input } from '@/components/ui/design-system';
import { useAuth } from '@/context/AuthContext';
import dayjs from 'dayjs';

export default function SalaryRulePage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canManageSalaryRules = hasPermission('salary.calculate');

  const [absentDeduction, setAbsentDeduction] = useState('');
  const [lateDeductionPerMinute, setLateDeductionPerMinute] = useState('');
  const [underworkDeductionPerHour, setUnderworkDeductionPerHour] = useState('');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Simulation calculator state
  const [simBaseSalary, setSimBaseSalary] = useState('3500000');
  const [simLateMins, setSimLateMins] = useState('20');
  const [simUnderworkHours, setSimUnderworkHours] = useState('2');
  const [simAbsentDays, setSimAbsentDays] = useState('1');

  const { isLoading: isLoadingActive } = useQuery({
    queryKey: ['activeSalaryRule'],
    queryFn: async () => {
      const res = await api.get('/salary-rules/active');
      setAbsentDeduction(res.data.absentDeduction.toString());
      setLateDeductionPerMinute(res.data.lateDeductionPerMinute.toString());
      setUnderworkDeductionPerHour(res.data.underworkDeductionPerHour.toString());
      return res.data;
    }
  });

  const { data: history = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['salaryRuleHistory'],
    queryFn: async () => {
      const res = await api.get('/salary-rules/history');
      return res.data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/salary-rules', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSalaryRule'] });
      queryClient.invalidateQueries({ queryKey: ['salaryRuleHistory'] });
      setSaveNotice('Aturan potongan gaji terbaru berhasil disimpan dan diaktifkan!');
      setTimeout(() => setSaveNotice(null), 4000);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Gagal menyimpan aturan gaji');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirm('Anda yakin ingin memperbarui aturan potongan gaji? Perubahan ini berlaku untuk perhitungan payroll berikutnya.')) {
      mutation.mutate({
        absentDeduction,
        lateDeductionPerMinute,
        underworkDeductionPerHour
      });
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Live simulation math
  const valAbsent = Number(absentDeduction) || 0;
  const valLate = Number(lateDeductionPerMinute) || 0;
  const valUnderwork = Number(underworkDeductionPerHour) || 0;

  const simBase = Number(simBaseSalary) || 0;
  const simLate = (Number(simLateMins) || 0) * valLate;
  const simUnder = (Number(simUnderworkHours) || 0) * valUnderwork;
  const simAbsent = (Number(simAbsentDays) || 0) * valAbsent;
  const totalSimDeduction = simLate + simUnder + simAbsent;
  const simNetSalary = Math.max(0, simBase - totalSimDeduction);

  if (!canManageSalaryRules) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-amber-600 mb-3" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-amber-100">Akses Dibatasi</h2>
        <p className="text-sm text-slate-500 dark:text-amber-300/70">
          Anda tidak memiliki izin untuk mengelola aturan gaji. Hubungi administrator untuk menambahkan izin yang sesuai.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      {/* Top Title Banner */}
      <section className="relative overflow-hidden rounded-[20px] sm:rounded-[28px] border border-amber-500/20 bg-gradient-to-br from-[#fffdfa] via-[#fdf6ec] to-[#f5ebdc] p-4 sm:p-6 shadow-sm dark:border-[#3e2e24] dark:from-[#241a13] dark:via-[#1e1510] dark:to-[#17100b]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
              <Calculator className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              Payroll & Remuneration Config
            </div>
            <h1 className="mt-2 text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-amber-50">
              Pengaturan Aturan Gaji & Potongan
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-medium leading-relaxed text-slate-600 dark:text-amber-200/80">
              Atur besaran denda keterlambatan, potongan jam kerja, dan sanksi absen secara dinamis.
            </p>
          </div>
          <Badge variant="success" className="w-fit px-3 py-1 text-xs font-bold">
            🟢 Sistem Payroll Aktif
          </Badge>
        </div>
      </section>

      {saveNotice && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-4 text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{saveNotice}</span>
        </div>
      )}

      {/* Main Grid: Form, Simulator, History */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Left Column: Form Edit Aturan (7 Col) */}
        <div className="space-y-5 lg:col-span-7">
          <Card className="border-amber-500/20 bg-white dark:border-[#3a2b20] dark:bg-[#221812]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Calculator className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Aturan Potongan Gaji (Status Aktif)
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-amber-300/70">
                Ubah nilai nominal. Sistem akan otomatis menerapkan aturan ini pada slip gaji bulanan berikutnya.
              </p>
            </CardHeader>
            <CardContent className="pt-2">
              {isLoadingActive ? (
                <div className="animate-pulse space-y-4 p-2">
                  <div className="h-10 bg-amber-500/10 rounded-2xl"></div>
                  <div className="h-10 bg-amber-500/10 rounded-2xl"></div>
                  <div className="h-10 bg-amber-500/10 rounded-2xl"></div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-amber-200">
                      1. Potongan Tidak Masuk / Tanpa Keterangan (Per Hari)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-500 dark:text-amber-400">Rp</span>
                      <Input
                        type="number"
                        min="0"
                        required
                        value={absentDeduction}
                        onChange={(e) => setAbsentDeduction(e.target.value)}
                        className="pl-10 font-bold text-slate-900 dark:text-amber-100"
                        placeholder="Contoh: 100000"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-amber-300/70">Denda nominal tetap jika karyawan tidak hadir/absen tanpa ijin.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-amber-200">
                      2. Potongan Keterlambatan Clock-In (Per Menit)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-500 dark:text-amber-400">Rp</span>
                      <Input
                        type="number"
                        min="0"
                        required
                        value={lateDeductionPerMinute}
                        onChange={(e) => setLateDeductionPerMinute(e.target.value)}
                        className="pl-10 font-bold text-slate-900 dark:text-amber-100"
                        placeholder="Contoh: 1000"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-amber-300/70">Potongan untuk setiap 1 menit keterlambatan masuk kerja dari jam shift.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-amber-200">
                      3. Potongan Kurang Jam Kerja (Per Jam)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-500 dark:text-amber-400">Rp</span>
                      <Input
                        type="number"
                        min="0"
                        required
                        value={underworkDeductionPerHour}
                        onChange={(e) => setUnderworkDeductionPerHour(e.target.value)}
                        className="pl-10 font-bold text-slate-900 dark:text-amber-100"
                        placeholder="Contoh: 15000"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-amber-300/70">Potongan jika total durasi jam kerja kurang dari target 8 jam per shift.</p>
                  </div>

                  <Button
                    type="submit"
                    disabled={mutation.isPending}
                    className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md gap-2 rounded-2xl"
                  >
                    <Save className="h-4 w-4" />
                    {mutation.isPending ? 'Menyimpan Aturan Baru...' : 'Simpan & Aktifkan Aturan Aturan Gaji'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Interactive Simulation Calculator */}
          <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-white to-amber-500/10 dark:border-[#3a2b20] dark:from-[#241a13] dark:via-[#1e1510] dark:to-[#17100b]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-amber-100">
                <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Simulasi Perhitungan Potongan Real-Time
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-amber-300/70">
                Uji langsung dampak nominal aturan potongan di atas terhadap slip gaji karyawan.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-amber-300/80">Simulasi Gaji Pokok (Rp)</label>
                  <Input
                    type="number"
                    value={simBaseSalary}
                    onChange={(e) => setSimBaseSalary(e.target.value)}
                    className="mt-1 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-amber-300/80">Keterlambatan (Menit)</label>
                  <Input
                    type="number"
                    value={simLateMins}
                    onChange={(e) => setSimLateMins(e.target.value)}
                    className="mt-1 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-amber-300/80">Kurang Jam Kerja (Jam)</label>
                  <Input
                    type="number"
                    value={simUnderworkHours}
                    onChange={(e) => setSimUnderworkHours(e.target.value)}
                    className="mt-1 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-amber-300/80">Tidak Masuk (Hari)</label>
                  <Input
                    type="number"
                    value={simAbsentDays}
                    onChange={(e) => setSimAbsentDays(e.target.value)}
                    className="mt-1 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Live Simulation Breakdown */}
              <div className="rounded-2xl border border-amber-500/20 bg-white/90 p-4 space-y-2 dark:border-amber-900/40 dark:bg-[#1a120c]">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-amber-300/70">Potongan Terlambat ({simLateMins}m):</span>
                  <span className="font-bold text-red-600 dark:text-red-400">-{formatCurrency(simLate)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-amber-300/70">Potongan Kurang Jam ({simUnderworkHours}j):</span>
                  <span className="font-bold text-red-600 dark:text-red-400">-{formatCurrency(simUnder)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-amber-300/70">Potongan Tidak Masuk ({simAbsentDays}h):</span>
                  <span className="font-bold text-red-600 dark:text-red-400">-{formatCurrency(simAbsent)}</span>
                </div>
                <div className="border-t border-dashed border-amber-500/20 pt-2 flex justify-between text-xs font-extrabold">
                  <span className="text-slate-800 dark:text-amber-100">Total Potongan Gaji:</span>
                  <span className="text-red-600 dark:text-red-400">-{formatCurrency(totalSimDeduction)}</span>
                </div>
                <div className="rounded-xl bg-emerald-500/10 p-2.5 flex justify-between items-center text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300 mt-2">
                  <span>Estimasi Gaji Bersih (Take Home Pay):</span>
                  <span className="text-base sm:text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{formatCurrency(simNetSalary)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Histori Perubahan Aturan (5 Col) */}
        <div className="lg:col-span-5">
          <Card className="border-amber-500/20 bg-white dark:border-[#3a2b20] dark:bg-[#221812] h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <History className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Histori Perubahan Aturan
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-amber-300/70">
                Audit log histori aturan potongan. Peraturan lama tersimpan otomatis untuk transparansi.
              </p>
            </CardHeader>
            <CardContent className="pt-2">
              {isLoadingHistory ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-amber-500/10 animate-pulse rounded-2xl" />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="text-center p-6 text-xs text-slate-500 border border-dashed border-amber-500/20 rounded-2xl dark:text-amber-300/60">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30 text-amber-600" />
                  Belum ada riwayat perubahan aturan.
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1">
                  {history.map((rule: any) => (
                    <div
                      key={rule.id}
                      className={`p-3.5 rounded-2xl border text-xs transition-all ${
                        rule.isActive
                          ? 'border-amber-500/40 bg-amber-500/10 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30'
                          : 'border-amber-500/15 bg-slate-50/50 dark:border-[#3a2b20] dark:bg-[#1a120c]'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2.5">
                        <div className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-amber-100">
                          <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          {dayjs(rule.createdAt).format('DD MMM YYYY, HH:mm')}
                        </div>
                        {rule.isActive ? (
                          <Badge variant="success" className="text-[9px] py-0.5 px-2">AKTIF SEKARANG</Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[9px] py-0.5 px-2">NONAKTIF</Badge>
                        )}
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between border-b border-amber-500/10 pb-1 dark:border-amber-900/20">
                          <span className="text-slate-600 dark:text-amber-300/70">Tidak Masuk (Hari):</span>
                          <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(rule.absentDeduction)}</span>
                        </div>
                        <div className="flex justify-between border-b border-amber-500/10 pb-1 dark:border-amber-900/20">
                          <span className="text-slate-600 dark:text-amber-300/70">Terlambat (Menit):</span>
                          <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(rule.lateDeductionPerMinute)}</span>
                        </div>
                        <div className="flex justify-between pb-0.5">
                          <span className="text-slate-600 dark:text-amber-300/70">Kurang Jam (Jam):</span>
                          <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(rule.underworkDeductionPerHour)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
