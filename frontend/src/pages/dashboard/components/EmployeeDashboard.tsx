import { Activity, Briefcase, Calendar, CheckCircle, Clock, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const recentActivity: Array<{ id: number; action: string; date: string; time: string }> = [];

export default function EmployeeDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-[#fffaf3] to-[#f7ebdc] dark:from-slate-900/90 dark:to-slate-900/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Hari Ini</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">Belum Absen</div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Silakan lakukan absensi</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jadwal Shift</CardTitle>
            <Briefcase className="h-4 w-4 text-[#6F4E37]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">08:00 - 17:00</div>
            <p className="mt-1 text-xs text-muted-foreground">Shift Pagi</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jam Kerja</CardTitle>
            <Clock className="h-4 w-4 text-[#C89B6D]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">40 Jam</div>
            <p className="mt-1 text-xs text-muted-foreground">Minggu ini</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden border-[#f0e0cc] bg-gradient-to-br from-white via-[#fffaf4] to-[#f7ebdc] p-0 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
          <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#6F4E37]/10 text-[#6F4E37] shadow-inner">
              <Clock className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#e9d0b0] bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6F4E37] dark:border-slate-700 dark:bg-slate-800/70 dark:text-[#e9c79b]">
                <Sparkles className="h-3 w-3" />
                Absensi modern
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Absensi Sekarang</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Pastikan Anda berada di area Warkop KOPI SELON sebelum melakukan pencatatan.</p>
            </div>
            <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row">
              <button className="flex-1 rounded-2xl bg-[#6F4E37] px-4 py-3 font-semibold text-white transition hover:bg-[#5a3d2b]">
                Clock In
              </button>
              <button className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                Clock Out
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#6F4E37]" />
              Aktivitas Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length ? recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f4e7d3] text-[#6F4E37] dark:bg-slate-800 dark:text-[#f4cda4]">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{activity.action}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{activity.date}</p>
                  </div>
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-300">{activity.time}</div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                  Belum ada aktivitas yang tercatat hari ini.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
