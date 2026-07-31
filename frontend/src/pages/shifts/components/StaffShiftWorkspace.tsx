import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CalendarClock,
  Calendar,
  CheckCircle2,
  ArrowLeftRight,
  CalendarCheck,
  Plus,
  Clock,
  Activity,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  employees?: any[];
}

interface StaffShiftWorkspaceProps {
  shifts: Shift[];
  employees: any[];
  canAssign: boolean;
  canCreate: boolean;
  onAssignClick: () => void;
  onAddShift?: () => void;
}

export default function StaffShiftWorkspace({
  shifts = [],
  employees = [],
  canAssign,
  canCreate,
  onAssignClick,
  onAddShift,
}: StaffShiftWorkspaceProps) {
  const navigate = useNavigate();
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('ALL');

  const totalShifts = shifts.length;
  const totalEmployees = employees.length;
  const assignedCount = employees.filter((e) => e.shiftId || e.shift).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-3 py-1 text-xs font-medium tracking-wider backdrop-blur-md text-blue-200">
              <Activity className="h-3.5 w-3.5" /> SHIFT OPERATIONS WORKSPACE
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Operasional Shift Staff</h1>
            <p className="mt-1 text-sm text-blue-100/90 max-w-xl">
              Kelola operasional harian, pantaulah jumlah personel per shift, persetujuan tukar/ubah shift, dan penugasan karyawan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canCreate && onAddShift && (
              <button
                type="button"
                onClick={onAddShift}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4 text-blue-600" /> Tambah Shift
              </button>
            )}
            {canAssign && (
              <button
                type="button"
                onClick={onAssignClick}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                <Users className="h-4 w-4 text-blue-600" /> Bantu Assign Shift
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/dashboard/requests')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-500"
            >
              <ArrowLeftRight className="h-4 w-4" /> Persetujuan Tukar / Change
            </button>
          </div>
        </div>
      </div>

      {/* OPERATIONS SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-xs font-medium text-slate-500">Shift Operasional</p>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-slate-100">{totalShifts}</p>
          <p className="mt-1 text-xs text-slate-400">Total shift aktif</p>
        </div>

        <div className="rounded-3xl border border-blue-200/80 bg-blue-50/40 p-5 shadow-sm backdrop-blur-xl dark:border-blue-900/40 dark:bg-blue-950/20">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Personel Ditugaskan</p>
          <p className="mt-2 text-3xl font-black text-blue-800 dark:text-blue-300">
            {assignedCount} / {totalEmployees}
          </p>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">Karyawan aktif</p>
        </div>

        <div className="rounded-3xl border border-amber-200/80 bg-amber-50/40 p-5 shadow-sm backdrop-blur-xl dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Persetujuan Swap & Change</p>
          <button
            type="button"
            onClick={() => navigate('/dashboard/requests')}
            className="mt-2 text-xs font-bold text-amber-800 dark:text-amber-300 underline flex items-center gap-1"
          >
            Buka Permintaan Pengajuan <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Permintaan penukaran & ubah shift</p>
        </div>
      </div>

      {/* QUICK WORKFLOW APPROVAL BUTTONS */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Tindakan Persetujuan Operasional Staff
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/requests')}
            className="flex items-center justify-between rounded-2xl border border-purple-200 bg-purple-50/60 p-4 text-left transition hover:bg-purple-100/80 dark:border-purple-900/40 dark:bg-purple-950/20"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Menyetujui Swap Shift</p>
                <p className="text-xs text-slate-500">Konfirmasi tukar shift antarkaryawan</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-purple-600" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/dashboard/requests')}
            className="flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-left transition hover:bg-blue-100/80 dark:border-blue-900/40 dark:bg-blue-950/20"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Menyetujui Change Shift</p>
                <p className="text-xs text-slate-500">Konfirmasi perpindahan jam shift</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-blue-600" />
          </button>
        </div>
      </div>

      {/* SHIFT CARDS & PERSONEL LIST */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-blue-600" /> Daftar Shift & Jumlah Personel
            </h2>
            <p className="text-xs text-slate-500">Monitoring jumlah personel per shift dan penugasan</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {shifts.map((shift) => {
            const empList = shift.employees || [];
            return (
              <div
                key={shift.id}
                className="rounded-3xl border border-slate-200/80 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">{shift.name}</h3>
                  <span className="rounded-xl bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                    {empList.length} Personel
                  </span>
                </div>

                <div className="mt-2 text-xl font-extrabold text-[#6F4E37] dark:text-amber-300">
                  {shift.startTime} - {shift.endTime} WIB
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Daftar Personel Bertugas:</p>
                  {empList.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {empList.map((emp: any) => (
                        <span
                          key={emp.id}
                          className="inline-flex items-center rounded-xl bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm border border-slate-200/60 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
                        >
                          {emp.firstName} {emp.lastName || ''}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400">Belum ada karyawan ditugaskan</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CALENDAR SHIFT OPERATIONS */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" /> Calendar Shift Operations
          </h2>
          <span className="text-xs text-slate-500">Jadwal Operasional Harian</span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-7 gap-3 text-xs">
          {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day) => (
            <div
              key={day}
              className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-950"
            >
              <p className="font-bold text-slate-700 dark:text-slate-200 mb-2">{day}</p>
              <div className="space-y-1.5">
                {shifts.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg bg-white p-1.5 shadow-sm dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800"
                  >
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{s.name}</p>
                    <p className="text-[10px] text-slate-400">{s.employees?.length || 0} Terjadwal</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
