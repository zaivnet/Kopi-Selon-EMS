import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Save,
  Wand2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Info,
  Clock,
  UserCheck
} from 'lucide-react';
import dayjs from 'dayjs';
import api from '@/lib/api';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName?: string | null;
  shiftId?: string | null;
  shift?: Shift | null;
  user?: {
    role?: {
      name?: string | null;
    } | null;
  } | null;
}

interface RosterMatrixBuilderProps {
  shifts: Shift[];
  employees: Employee[];
  onSuccess?: () => void;
}

export default function RosterMatrixBuilder({
  shifts = [],
  employees = [],
  onSuccess
}: RosterMatrixBuilderProps) {
  const [currentMonth, setCurrentMonth] = useState<dayjs.Dayjs>(dayjs());
  const [gridData, setGridData] = useState<Record<string, Record<string, string>>>({}); // employeeId -> dateStr (YYYY-MM-DD) -> shiftId ('OFF' | shiftId)
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(0);

  // Pattern tool state
  const [selectedEmpForPattern, setSelectedEmpForPattern] = useState<string>('');
  const [patternInput, setPatternInput] = useState<string[]>([]);
  const [isPatternModalOpen, setIsPatternModalOpen] = useState<boolean>(false);

  // Filter employees to Karyawan role only
  const workerEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const roleName = emp.user?.role?.name;
      return !roleName || roleName === 'Karyawan';
    });
  }, [employees]);

  // Compute days of current month
  const monthDays = useMemo(() => {
    const daysInMonth = currentMonth.daysInMonth();
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = currentMonth.date(d);
      days.push({
        dayNumber: d,
        dateStr: dateObj.format('YYYY-MM-DD'),
        dayName: dateObj.format('ddd'), // Sen, Sel, Rab...
        isWeekend: dateObj.day() === 0 || dateObj.day() === 6 // Sun or Sat
      });
    }
    return days;
  }, [currentMonth]);

  // Compute displayed days based on week filter
  const displayedDays = useMemo(() => {
    if (selectedWeek === 0) return monthDays;
    const startIdx = (selectedWeek - 1) * 7;
    const endIdx = selectedWeek * 7;
    return monthDays.slice(startIdx, endIdx);
  }, [monthDays, selectedWeek]);

  // Fetch schedules for current month
  const fetchMonthSchedules = async () => {
    setIsLoading(true);
    try {
      const monthStr = currentMonth.format('YYYY-MM');
      const res = await api.get(`/shifts/schedules?month=${monthStr}`);
      const schedules = res.data || [];

      const initialGrid: Record<string, Record<string, string>> = {};

      // Initialize empty for all worker employees
      workerEmployees.forEach((emp) => {
        initialGrid[emp.id] = {};
      });

      // Populate from DB
      schedules.forEach((sch: any) => {
        const empId = sch.employeeId;
        const dateStr = dayjs(sch.date).format('YYYY-MM-DD');
        if (!initialGrid[empId]) {
          initialGrid[empId] = {};
        }
        initialGrid[empId][dateStr] = sch.shiftId;
      });

      setGridData(initialGrid);
    } catch (err) {
      console.warn('Gagal memuat jadwal roster:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workerEmployees.length > 0) {
      fetchMonthSchedules();
    }
  }, [currentMonth, workerEmployees.length]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Change single cell shift
  const handleCellChange = (employeeId: string, dateStr: string, value: string) => {
    setGridData((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [dateStr]: value
      }
    }));
  };

  // Tool 1: Fill Default Master Shift for empty cells
  const handleFillDefaultShifts = () => {
    setGridData((prev) => {
      const next = { ...prev };
      workerEmployees.forEach((emp) => {
        if (!next[emp.id]) next[emp.id] = {};
        const defaultShiftId = emp.shiftId || emp.shift?.id;
        if (defaultShiftId) {
          monthDays.forEach((day) => {
            if (!next[emp.id][day.dateStr]) {
              next[emp.id][day.dateStr] = defaultShiftId;
            }
          });
        }
      });
      return next;
    });
    showToast('Master shift berhasil diisikan ke sel yang belum terisi.');
  };

  // Tool 2: Set Sundays OFF
  const handleSetSundaysOff = () => {
    setGridData((prev) => {
      const next = { ...prev };
      workerEmployees.forEach((emp) => {
        if (!next[emp.id]) next[emp.id] = {};
        monthDays.forEach((day) => {
          if (dayjs(day.dateStr).day() === 0) { // Sunday
            next[emp.id][day.dateStr] = 'OFF';
          }
        });
      });
      return next;
    });
    showToast('Hari Minggu berhasil di-set status LIBUR (OFF).');
  };

  // Tool 3: Apply rotation pattern to selected employee
  const handleApplyPattern = () => {
    if (!selectedEmpForPattern || patternInput.length === 0) return;

    setGridData((prev) => {
      const next = { ...prev };
      if (!next[selectedEmpForPattern]) next[selectedEmpForPattern] = {};

      monthDays.forEach((day, index) => {
        const shiftIdForDay = patternInput[index % patternInput.length];
        next[selectedEmpForPattern][day.dateStr] = shiftIdForDay;
      });
      return next;
    });

    setIsPatternModalOpen(false);
    showToast(`Pola rotasi berhasil diterapkan untuk karyawan.`);
  };

  // Save full monthly grid to backend
  const handleSaveRoster = async () => {
    setIsSaving(true);
    try {
      const schedulesPayload: { employeeId: string; date: string; shiftId: string | null }[] = [];

      Object.entries(gridData).forEach(([employeeId, dateMap]) => {
        Object.entries(dateMap).forEach(([dateStr, shiftId]) => {
          schedulesPayload.push({
            employeeId,
            date: dateStr,
            shiftId: shiftId === 'OFF' ? null : shiftId
          });
        });
      });

      const res = await api.post('/shifts/schedules/bulk', {
        schedules: schedulesPayload
      });

      showToast(res.data?.message || 'Roster matriks berhasil disimpan.');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan roster matriks.');
    } finally {
      setIsSaving(false);
    }
  };

  // Shift badge color helper
  const getShiftBadgeStyle = (shiftId: string | undefined, defaultShiftId?: string | null) => {
    if (!shiftId) {
      if (defaultShiftId) {
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      }
      return 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700';
    }
    if (shiftId === 'OFF') {
      return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
    }
    const foundShift = shifts.find((s) => s.id === shiftId);
    if (!foundShift) return 'bg-blue-50 text-blue-700 border-blue-200';

    // Color gradient based on shift index or name
    const index = shifts.findIndex((s) => s.id === shiftId);
    const colors = [
      'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
      'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
      'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-bold text-white shadow-2xl backdrop-blur-xl border border-slate-700 dark:bg-amber-500 dark:text-slate-950 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 dark:text-slate-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER & MONTH SELECTOR BAR */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-amber-100 flex items-center gap-2">
                Roster Matrix Builder
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                  Excel Grid Mode
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur dan klik shift harian karyawan beda-beda per tanggal untuk 1 bulan penuh.
              </p>
            </div>
          </div>

          {/* MONTH NAVIGATOR */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentMonth(currentMonth.subtract(1, 'month'))}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-900 dark:border-amber-900/40 dark:text-amber-300">
              <Clock className="h-3.5 w-3.5" />
              <span>{currentMonth.format('MMMM YYYY')}</span>
            </div>
            <button
              type="button"
              onClick={() => setCurrentMonth(currentMonth.add(1, 'month'))}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* TOOLBAR BUTTONS */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleFillDefaultShifts}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> Isi Master Shift
            </button>
            <button
              type="button"
              onClick={handleSetSundaysOff}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <Info className="h-3.5 w-3.5" /> Set Minggu OFF
            </button>
            <button
              type="button"
              onClick={() => setIsPatternModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300"
            >
              <Wand2 className="h-3.5 w-3.5" /> Salin Pola Rotasi
            </button>
            <button
              type="button"
              onClick={fetchMonthSchedules}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Reload
            </button>
          </div>

          <button
            type="button"
            onClick={handleSaveRoster}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-2 text-xs font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Menyimpan...' : 'Simpan Roster Bulan Ini'}
          </button>
        </div>
      </div>

      {/* WEEK SELECTION TABS */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 w-fit">
        {[
          { label: 'Semua (1 Bulan)', value: 0 },
          { label: 'Minggu 1 (Tgl 1-7)', value: 1 },
          { label: 'Minggu 2 (Tgl 8-14)', value: 2 },
          { label: 'Minggu 3 (Tgl 15-21)', value: 3 },
          { label: 'Minggu 4 (Tgl 22-28)', value: 4 },
          { label: 'Minggu 5 (Tgl 29+)', value: 5 }
        ].map((wk) => (
          <button
            key={wk.value}
            type="button"
            onClick={() => setSelectedWeek(wk.value)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedWeek === wk.value
                ? 'bg-[#6F4E37] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {wk.label}
          </button>
        ))}
      </div>

      {/* MATRIX SPREADSHEET GRID */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-950 p-3.5 font-extrabold text-slate-700 dark:text-slate-200 min-w-[200px] shadow-sm border-r border-slate-200 dark:border-slate-800">
                  Nama Karyawan
                </th>
                <th className="p-3.5 font-bold text-slate-600 dark:text-slate-400 min-w-[120px] text-center border-r border-slate-200 dark:border-slate-800">
                  Master Shift
                </th>
                {displayedDays.map((day) => (
                  <th
                    key={day.dateStr}
                    className={`p-2.5 text-center min-w-[90px] border-r border-slate-200/70 dark:border-slate-800 ${
                      day.isWeekend
                        ? 'bg-amber-50/80 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 font-extrabold'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">{day.dayName}</div>
                    <div className="text-sm font-extrabold">{day.dayNumber}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {workerEmployees.length === 0 ? (
                <tr>
                  <td colSpan={displayedDays.length + 2} className="p-8 text-center text-slate-400 italic">
                    Tidak ada Karyawan atau Staff aktif ditemukan.
                  </td>
                </tr>
              ) : (
                workerEmployees.map((emp) => {
                  const empDefaultShift = shifts.find((s) => s.id === (emp.shiftId || emp.shift?.id));
                  return (
                    <tr key={emp.id} className="hover:bg-amber-50/20 dark:hover:bg-slate-800/30 transition-colors">
                      {/* STICKY EMPLOYEE NAME */}
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 p-3.5 font-bold text-slate-800 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="truncate font-semibold">{emp.firstName} {emp.lastName || ''}</div>
                        <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500">{emp.user?.role?.name || 'Karyawan'}</div>
                      </td>

                      {/* MASTER SHIFT BADGE */}
                      <td className="p-3 text-center border-r border-slate-200/70 dark:border-slate-800">
                        <span className="inline-block rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {empDefaultShift ? empDefaultShift.name : 'Master Off'}
                        </span>
                      </td>

                      {/* DAILY SHIFT CELLS */}
                      {displayedDays.map((day) => {
                        const currentVal = gridData[emp.id]?.[day.dateStr] || '';
                        const badgeStyle = getShiftBadgeStyle(currentVal, emp.shiftId);

                        return (
                          <td
                            key={day.dateStr}
                            className={`p-1.5 text-center border-r border-slate-200/70 dark:border-slate-800 ${
                              day.isWeekend ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                            }`}
                          >
                            <select
                              value={currentVal}
                              onChange={(e) => handleCellChange(emp.id, day.dateStr, e.target.value)}
                              className={`w-full h-8 rounded-lg border text-[11px] font-bold px-1.5 text-center cursor-pointer transition-all focus:ring-2 focus:ring-amber-500 focus:outline-none ${badgeStyle}`}
                            >
                              <option value="" className="text-slate-800 bg-white dark:bg-slate-900">
                                {empDefaultShift ? `Default (${empDefaultShift.name.split(' ')[0]})` : 'Tanpa Shift'}
                              </option>
                              {shifts.map((s) => (
                                <option key={s.id} value={s.id} className="text-slate-800 bg-white dark:bg-slate-900">
                                  {s.name} ({s.startTime}-{s.endTime})
                                </option>
                              ))}
                              <option value="OFF" className="text-rose-700 bg-rose-50 dark:bg-slate-900 font-bold">
                                ⛔ LIBUR (OFF)
                              </option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PATTERN AUTO-FILL MODAL */}
      {isPatternModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-800 dark:text-amber-100 flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-indigo-500" /> Salin Pola Rotasi Shift
              </h3>
              <button
                type="button"
                onClick={() => setIsPatternModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Pilih Karyawan Target *</label>
                <select
                  value={selectedEmpForPattern}
                  onChange={(e) => setSelectedEmpForPattern(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {workerEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName || ''} ({emp.user?.role?.name || 'Karyawan'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Susun Urutan Pola Hari Berulang (Contoh: 2 Pagi, 2 Siang, 2 Malam, 1 Off)
                </label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {patternInput.map((shiftVal, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-12 text-center font-bold text-slate-400">Hari {idx + 1}</span>
                      <select
                        value={shiftVal}
                        onChange={(e) => {
                          const next = [...patternInput];
                          next[idx] = e.target.value;
                          setPatternInput(next);
                        }}
                        className="flex h-9 flex-1 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                      >
                        {shifts.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                        <option value="OFF">LIBUR (OFF)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setPatternInput(patternInput.filter((_, i) => i !== idx))}
                        className="text-rose-500 font-bold px-2 hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPatternInput([...patternInput, shifts[0]?.id || 'OFF'])}
                    className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300"
                  >
                    + Tambah Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (shifts.length >= 2) {
                        setPatternInput([shifts[0].id, shifts[0].id, shifts[1].id, shifts[1].id, 'OFF']);
                      }
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Preset Pola Standard (2-2-1)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsPatternModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyPattern}
                disabled={!selectedEmpForPattern || patternInput.length === 0}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Terapkan Ke 1 Bulan Penuh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
