import { useState } from 'react';
import {
  BarChart2,
  Users,
  Calendar,
  ShieldAlert,
  Eye,
  PieChart as PieChartIcon,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  employees?: any[];
}

interface OwnerShiftWorkspaceProps {
  shifts: Shift[];
  employees: any[];
}

export default function OwnerShiftWorkspace({ shifts = [], employees = [] }: OwnerShiftWorkspaceProps) {
  const [_activeTab, _setActiveTab] = useState<'distribution' | 'calendar' | 'stats'>('distribution');

  // Compute statistics for Executive View
  const totalShifts = shifts.length;
  const totalEmployees = employees.length;
  const assignedEmployeesCount = employees.filter((e) => e.shiftId || e.shift).length;
  const unassignedCount = totalEmployees - assignedEmployeesCount;
  const coveragePercent = totalEmployees > 0 ? Math.round((assignedEmployeesCount / totalEmployees) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1 text-xs font-medium tracking-wider backdrop-blur-md text-amber-300">
              <Eye className="h-3.5 w-3.5" /> EXECUTIVE MONITORING (READ ONLY)
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Shift Executive Workspace</h1>
            <p className="mt-1 text-sm text-slate-300 max-w-xl">
              Pemantauan eksekutif khusus Owner. Pantau distribusi personel per shift, cakupan jadwal, dan statistik kehadiran operasional warkop.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 backdrop-blur-md text-xs font-semibold">
            <ShieldAlert className="h-4 w-4 text-emerald-400" /> Mode Hanya Lihat (Read-Only)
          </div>
        </div>
      </div>

      {/* EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Shift Aktif</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-800 dark:text-slate-100">{totalShifts}</p>
          <p className="mt-1 text-[11px] text-slate-400">Shift operasional 24 jam</p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Personel</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-800 dark:text-slate-100">{totalEmployees}</p>
          <p className="mt-1 text-[11px] text-slate-400">{assignedEmployeesCount} Terjadwal</p>
        </div>

        <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm backdrop-blur-xl dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Cakupan Shift (%)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-emerald-800 dark:text-emerald-300">{coveragePercent}%</p>
          <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">Tingkat efisiensi penugasan</p>
        </div>

        <div className="rounded-3xl border border-amber-200/80 bg-amber-50/40 p-5 shadow-sm backdrop-blur-xl dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Unassigned Personel</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-amber-800 dark:text-amber-300">{unassignedCount}</p>
          <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Belum mendapat shift</p>
        </div>
      </div>

      {/* SHIFT DISTRIBUTION BREAKDOWN & METRICS */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-indigo-500" /> Distribusi Shift & Personel
            </h2>
            <p className="text-xs text-slate-500">Jumlah karyawan yang bertugas pada masing-masing shift</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {shifts.map((shift) => {
            const empCount = shift.employees?.length || 0;
            const percentOfTotal = totalEmployees > 0 ? Math.round((empCount / totalEmployees) * 100) : 0;

            return (
              <div
                key={shift.id}
                className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50/70 p-5 transition hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-100">{shift.name}</span>
                  <span className="text-xs font-mono font-semibold text-slate-500">
                    {shift.startTime} - {shift.endTime}
                  </span>
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-3xl font-black text-[#6F4E37] dark:text-amber-300">{empCount}</span>
                  <span className="text-xs font-semibold text-slate-500">{percentOfTotal}% Dari Total Personel</span>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#6F4E37] to-[#C89B6D]"
                    style={{ width: `${percentOfTotal}%` }}
                  />
                </div>

                {/* Employee Pills - Read Only */}
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Personel Terdaftar:
                  </p>
                  {shift.employees && shift.employees.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {shift.employees.map((emp) => (
                        <span
                          key={emp.id}
                          className="inline-flex items-center rounded-xl bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm border border-slate-200/60 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
                        >
                          {emp.firstName} {emp.lastName || ''}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400">Belum ada personel ditugaskan</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KALENDER SHIFT & STATISTIK ATTENDANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kalender Shift Executive */}
        <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" /> Kalender Shift Eksekutif
            </h2>
            <span className="text-xs text-slate-500">Overview Minggu Ini</span>
          </div>

          <div className="mt-4 space-y-3">
            {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day, _idx) => (
              <div
                key={day}
                className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100 dark:bg-slate-950 dark:border-slate-800 text-xs"
              >
                <span className="font-bold text-slate-700 dark:text-slate-200 w-20">{day}</span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  {shifts.slice(0, 3).map((s) => (
                    <span
                      key={s.id}
                      className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800"
                    >
                      {s.name.split(' ')[0]}: {s.employees?.length || 0} org
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grafik & Key Attendance Metrics */}
        <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-emerald-500" /> Grafik Kehadiran & Coverage
            </h2>
            <span className="text-xs text-slate-500">Live Readiness</span>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                <span>Shift Pagi Readiness</span>
                <span>95%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: '95%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                <span>Shift Siang Readiness</span>
                <span>90%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-blue-500" style={{ width: '90%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                <span>Shift Malam Readiness</span>
                <span>85%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-purple-500" style={{ width: '85%' }} />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <CheckCircle2 className="h-4 w-4" /> Catatan Eksekutif
                </div>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                  Operasional shift warkop KOPI SELON berjalan optimal 24 jam dengan tingkat kecukupan personel {coveragePercent}%.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
