import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  CalendarClock,
  Users,
  Calendar,
  AlertTriangle,
  FileText,
  ShieldCheck,
  CheckCircle2,
  UserX,
  Sparkles,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  employees?: any[];
}

interface AdminShiftWorkspaceProps {
  shifts: Shift[];
  employees: any[];
  onAddShift: () => void;
  onEditShift: (shift: Shift) => void;
  onDeleteShift: (id: string) => void;
  onAssignShift: () => void;
}

export default function AdminShiftWorkspace({
  shifts = [],
  employees = [],
  onAddShift,
  onEditShift,
  onDeleteShift,
  onAssignShift,
}: AdminShiftWorkspaceProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'shifts' | 'calendar' | 'issues'>('shifts');

  const totalShifts = shifts.length;
  const totalEmployees = employees.length;
  const assignedEmployees = employees.filter((e) => e.shiftId || e.shift);
  const unassignedEmployees = employees.filter((e) => !e.shiftId && !e.shift);

  // Compute shifts with shortages (e.g. shifts with less than 2 employees)
  const shiftsWithShortage = shifts.filter((s) => !s.employees || s.employees.length < 2);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#6F4E37] via-[#8B5A2B] to-[#C89B6D] p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-3 py-1 text-xs font-medium tracking-wider backdrop-blur-md text-amber-200">
              <ShieldCheck className="h-3.5 w-3.5" /> SHIFT MANAGEMENT WORKSPACE
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Shift Management (Administrator)</h1>
            <p className="mt-1 text-sm text-amber-100/90 max-w-xl">
              Kontrol penuh pembuatan shift, penugasan karyawan, deteksi kekurangan personel, resolusi konflik jadwal, dan integrasi pengajuan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAddShift}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-bold text-[#6F4E37] shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-50"
            >
              <Plus className="h-4 w-4" /> Tambah Shift
            </button>
            <button
              type="button"
              onClick={onAssignShift}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              <Users className="h-4 w-4" /> Assign Shift
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/requests')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-900/60 px-4 py-2.5 text-xs font-bold text-amber-100 backdrop-blur-md transition hover:bg-amber-900/80"
            >
              <FileText className="h-4 w-4" /> Employee Requests
            </button>
          </div>
        </div>
      </div>

      {/* KPI & MANAGEMENT STATS */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs font-medium text-slate-500">Total Shift</p>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-slate-100">{totalShifts}</p>
          <p className="mt-1 text-[11px] text-slate-400">Shift operasional 24 Jam</p>
        </div>

        <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm backdrop-blur-xl dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Karyawan Terjadwal</p>
          <p className="mt-2 text-3xl font-black text-emerald-800 dark:text-emerald-300">
            {assignedEmployees.length} / {totalEmployees}
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">Sudah memiliki shift</p>
        </div>

        <div className="rounded-3xl border border-rose-200/80 bg-rose-50/40 p-5 shadow-sm backdrop-blur-xl dark:border-rose-900/40 dark:bg-rose-950/20">
          <p className="text-xs font-medium text-rose-700 dark:text-rose-400">Kekurangan Personel</p>
          <p className="mt-2 text-3xl font-black text-rose-800 dark:text-rose-300">{shiftsWithShortage.length}</p>
          <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">Shift butuh &lt; 2 personel</p>
        </div>

        <div className="rounded-3xl border border-amber-200/80 bg-amber-50/40 p-5 shadow-sm backdrop-blur-xl dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Konflik / Unassigned</p>
          <p className="mt-2 text-3xl font-black text-amber-800 dark:text-amber-300">{unassignedEmployees.length}</p>
          <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Karyawan tanpa shift</p>
        </div>
      </div>

      {/* VIEW SELECTION TABS */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('shifts')}
          className={cn(
            'flex items-center gap-2 pb-3 px-4 border-b-2 transition',
            activeTab === 'shifts'
              ? 'border-[#6F4E37] text-[#6F4E37] dark:border-amber-400 dark:text-amber-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          )}
        >
          <CalendarClock className="h-4 w-4" /> Kelola Shift & Siapa Bertugas
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={cn(
            'flex items-center gap-2 pb-3 px-4 border-b-2 transition',
            activeTab === 'calendar'
              ? 'border-[#6F4E37] text-[#6F4E37] dark:border-amber-400 dark:text-amber-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          )}
        >
          <Calendar className="h-4 w-4" /> Kalender Seluruh Karyawan
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('issues')}
          className={cn(
            'flex items-center gap-2 pb-3 px-4 border-b-2 transition',
            activeTab === 'issues'
              ? 'border-[#6F4E37] text-[#6F4E37] dark:border-amber-400 dark:text-amber-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          )}
        >
          <AlertTriangle className="h-4 w-4" /> Kekurangan Personel & Konflik ({shiftsWithShortage.length + unassignedEmployees.length})
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* TAB 1: SHIFTS MANAGEMENT */}
      {activeTab === 'shifts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shifts.map((shift) => {
            const empList = shift.employees || [];
            return (
              <div
                key={shift.id}
                className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/70"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#6F4E37] text-white shadow">
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100">{shift.name}</h3>
                      <p className="text-xs text-slate-500">Official Shift</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditShift(shift)}
                      className="rounded-xl p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                      title="Edit Shift"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteShift(shift.id)}
                      className="rounded-xl p-1.5 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Hapus Shift"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                  {shift.startTime} - {shift.endTime} WIB
                </div>

                <div className="mt-5 pt-4 border-t border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Siapa Yang Bertugas ({empList.length}):
                    </span>
                    <button
                      type="button"
                      onClick={onAssignShift}
                      className="text-xs font-bold text-[#6F4E37] dark:text-amber-300 hover:underline"
                    >
                      + Assign
                    </button>
                  </div>

                  {empList.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {empList.map((emp: any) => (
                        <span
                          key={emp.id}
                          className="inline-flex items-center rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm border border-slate-200/60 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                        >
                          {emp.firstName} {emp.lastName || ''}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400 py-2">Belum ada karyawan yang ditugaskan.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: KALENDER SELURUH KARYAWAN */}
      {activeTab === 'calendar' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-500" /> Kalender Matriks Shift Seluruh Karyawan
              </h2>
              <p className="text-xs text-slate-500">Tampilan lengkap penjadwalan minggu operasional</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/requests')}
              className="text-xs font-bold text-[#6F4E37] dark:text-amber-300 hover:underline flex items-center gap-1"
            >
              Lihat Pengajuan Tukar/Ubah Shift <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500 dark:bg-slate-950">
                <tr>
                  <th className="p-3">Nama Karyawan</th>
                  <th className="p-3">Shift Resmi</th>
                  <th className="p-3">Sen</th>
                  <th className="p-3">Sel</th>
                  <th className="p-3">Rab</th>
                  <th className="p-3">Kam</th>
                  <th className="p-3">Jum</th>
                  <th className="p-3">Sab</th>
                  <th className="p-3">Min</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-amber-50/30 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">
                      {emp.firstName} {emp.lastName || ''}
                    </td>
                    <td className="p-3">
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {emp.shift?.name || 'Tanpa Shift'}
                      </span>
                    </td>
                    {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
                      <td key={day} className="p-3 text-center">
                        <span className="inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {emp.shift?.name?.split(' ')[0] || 'Off'}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: KEKURANGAN PERSONEL & KONFLIK JADWAL */}
      {activeTab === 'issues' && (
        <div className="space-y-6">
          {/* Section: Shift Kekurangan Personel */}
          <div className="rounded-3xl border border-rose-200/80 bg-rose-50/30 p-6 shadow-sm backdrop-blur-xl dark:border-rose-900/40 dark:bg-rose-950/10">
            <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4" /> Shift Dengan Kekurangan Personel (&lt; 2 Personel)
            </h3>
            {shiftsWithShortage.length === 0 ? (
              <div className="rounded-2xl bg-white p-4 text-center text-xs font-semibold text-emerald-700 border border-emerald-200 dark:bg-slate-900 dark:border-emerald-800">
                ✓ Seluruh shift telah memenuhi minimum kebutuhan personel.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {shiftsWithShortage.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-rose-200 bg-white p-4 dark:border-rose-900 dark:bg-slate-900 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{s.name}</p>
                      <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                        Hanya {s.employees?.length || 0} personel ditugaskan
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onAssignShift}
                      className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-rose-700"
                    >
                      Assign Personel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Karyawan Tanpa Shift (Unassigned) */}
          <div className="rounded-3xl border border-amber-200/80 bg-amber-50/30 p-6 shadow-sm backdrop-blur-xl dark:border-amber-900/40 dark:bg-amber-950/10">
            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-4">
              <UserX className="h-4 w-4" /> Karyawan Belum Ditugaskan Shift ({unassignedEmployees.length})
            </h3>
            {unassignedEmployees.length === 0 ? (
              <div className="rounded-2xl bg-white p-4 text-center text-xs font-semibold text-emerald-700 border border-emerald-200 dark:bg-slate-900 dark:border-emerald-800">
                ✓ Seluruh karyawan telah memiliki penugasan shift resmi.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {unassignedEmployees.map((emp) => (
                  <span
                    key={emp.id}
                    className="inline-flex items-center gap-2 rounded-2xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm dark:bg-slate-900 dark:text-amber-300 dark:border-amber-800"
                  >
                    {emp.firstName} {emp.lastName || ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
