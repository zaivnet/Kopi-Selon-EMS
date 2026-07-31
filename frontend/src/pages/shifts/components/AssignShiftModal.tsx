import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Search, Users, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  status?: string | null;
  user?: { role?: { name?: string | null } | null } | null;
};

type ShiftEmployee = Pick<Employee, 'id' | 'firstName' | 'lastName'>;

type Shift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  employees?: ShiftEmployee[] | null;
};

type Feedback = {
  type: 'success' | 'error';
  message: string;
};

type Props = {
  shifts: unknown;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

export default function AssignShiftModal({ shifts, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const validShifts = Array.isArray(shifts) ? shifts as Shift[] : [];
  const shiftsMalformed = !Array.isArray(shifts);

  const {
    data: employees,
    isLoading: employeesLoading,
    isError: employeesFailed,
    error: employeesError,
    refetch: refetchEmployees,
  } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees');
      if (!Array.isArray(response.data)) {
        throw new Error('Format data karyawan dari server tidak valid.');
      }
      return response.data as Employee[];
    },
  });

  const activeEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];

    const WORKER_ROLES = ['Karyawan', 'Staff'];

  return employees.filter((employee) => {
      const role = employee.user?.role?.name;
      return employee.status === 'ACTIVE' && WORKER_ROLES.includes(role || '');
    });
  }, [employees]);

  const selectedShift = useMemo(
    () => validShifts.find((shift) => shift?.id === selectedShiftId),
    [selectedShiftId, validShifts],
  );

  const visibleEmployees = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('id-ID');
    if (!keyword) return activeEmployees;

    return activeEmployees.filter((employee) =>
      `${employee.firstName} ${employee.lastName} ${employee.user?.role?.name ?? ''}`
        .toLocaleLowerCase('id-ID')
        .includes(keyword),
    );
  }, [activeEmployees, search]);

  useEffect(() => {
    setFeedback(null);
    setConfirmEmpty(false);
    setSearch('');

    if (!selectedShiftId) {
      setSelectedEmployees([]);
      return;
    }

    const shift = validShifts.find((item) => item?.id === selectedShiftId);
    if (!shift) {
      setSelectedEmployees([]);
      setFeedback({ type: 'error', message: 'Shift yang dipilih tidak ditemukan. Muat ulang halaman lalu coba lagi.' });
      return;
    }

    if (shift.employees != null && !Array.isArray(shift.employees)) {
      setSelectedEmployees([]);
      setFeedback({ type: 'error', message: 'Data anggota shift dari server tidak valid. Penugasan belum dapat diubah.' });
      return;
    }

    const activeEmployeeIds = new Set(activeEmployees.map((employee) => employee.id));
    const assignedIds = (shift.employees ?? [])
      .map((employee) => employee?.id)
      .filter((id): id is string => typeof id === 'string' && activeEmployeeIds.has(id));
    setSelectedEmployees([...new Set(assignedIds)]);
  }, [selectedShiftId, shifts, employees, activeEmployees]);

  const toggleEmployee = (id: string) => {
    if (isSubmitting) return;
    setFeedback(null);
    setConfirmEmpty(false);
    setSelectedEmployees((current) =>
      current.includes(id) ? current.filter((employeeId) => employeeId !== id) : [...current, id],
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setFeedback(null);
    if (!selectedShiftId) {
      setFeedback({ type: 'error', message: 'Pilih shift terlebih dahulu.' });
      return;
    }
    if (!selectedShift || shiftsMalformed || (selectedShift.employees != null && !Array.isArray(selectedShift.employees))) {
      setFeedback({ type: 'error', message: 'Data shift tidak valid. Muat ulang halaman lalu coba lagi.' });
      return;
    }
    if (selectedEmployees.length === 0 && !confirmEmpty) {
      setFeedback({ type: 'error', message: 'Konfirmasi pengosongan shift sebelum menyimpan.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/shifts/assign', {
        shiftId: selectedShiftId,
        employeeIds: selectedEmployees,
      });
      const message = typeof response.data?.message === 'string'
        ? response.data.message
        : 'Penugasan shift berhasil disimpan.';
      setFeedback({ type: 'success', message });
      await queryClient.invalidateQueries({ queryKey: ['shifts'] });
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await onSuccess();
      onClose();
    } catch (error: any) {
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Gagal menyimpan penugasan shift. Silakan coba lagi.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEmptyAssignment = Boolean(selectedShiftId) && selectedEmployees.length === 0;
  const hasBlockingDataError = shiftsMalformed || employeesFailed ||
    Boolean(selectedShift?.employees != null && !Array.isArray(selectedShift.employees));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-shift-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border bg-card shadow-xl"
      >
        <header className="flex items-start justify-between border-b px-6 py-5">
          <div>
            <h2 id="assign-shift-title" className="text-xl font-semibold">Assign Karyawan ke Shift</h2>
            <p className="mt-1 text-sm text-muted-foreground">Atur anggota aktif untuk satu shift kerja.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Tutup"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto px-6 py-5">
            {shiftsMalformed && (
              <InlineNotice type="error" message="Format data shift dari server tidak valid. Muat ulang halaman." />
            )}

            <div>
              <label htmlFor="assign-shift" className="text-sm font-medium">Pilih Shift</label>
              <select
                id="assign-shift"
                value={selectedShiftId}
                onChange={(event) => setSelectedShiftId(event.target.value)}
                disabled={isSubmitting || shiftsMalformed || validShifts.length === 0}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">-- Pilih Shift --</option>
                {validShifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} ({shift.startTime} - {shift.endTime})
                  </option>
                ))}
              </select>
              {!shiftsMalformed && validShifts.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">Belum ada shift. Buat shift terlebih dahulu.</p>
              )}
            </div>

            {selectedShiftId && (
              <>
                <div className="flex items-center justify-between rounded-lg border bg-muted/35 px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{selectedEmployees.length} karyawan dipilih</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Sebelumnya {Array.isArray(selectedShift?.employees) ? selectedShift.employees.length : 0}
                  </span>
                </div>

                <div>
                  <label htmlFor="employee-search" className="text-sm font-medium">Pilih Karyawan</label>
                  <div className="relative mt-1.5">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="employee-search"
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      disabled={isSubmitting || employeesLoading || employeesFailed}
                      placeholder="Cari nama atau role..."
                      className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    />
                  </div>

                  <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
                    {employeesLoading ? (
                      <p className="p-3 text-sm text-muted-foreground">Memuat karyawan aktif...</p>
                    ) : employeesFailed ? (
                      <div className="p-3">
                        <p className="text-sm text-destructive">
                          {employeesError instanceof Error ? employeesError.message : 'Gagal memuat data karyawan.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => refetchEmployees()}
                          className="mt-2 text-sm font-medium text-primary hover:underline"
                        >
                          Coba lagi
                        </button>
                      </div>
                    ) : activeEmployees.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">Tidak ada Karyawan atau Staff aktif yang dapat ditugaskan.</p>
                    ) : visibleEmployees.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">Tidak ada karyawan yang cocok dengan pencarian.</p>
                    ) : (
                      visibleEmployees.map((employee) => (
                        <label
                          key={employee.id}
                          className="flex cursor-pointer items-center gap-3 rounded-md border border-transparent p-2.5 hover:border-border hover:bg-muted"
                        >
                          <input
                            type="checkbox"
                            checked={selectedEmployees.includes(employee.id)}
                            onChange={() => toggleEmployee(employee.id)}
                            disabled={isSubmitting}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {employee.firstName} {employee.lastName}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {employee.user?.role?.name || 'Tanpa role'}
                            </span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">
                  Karyawan terpilih akan dipindahkan ke shift ini. Anggota lama yang tidak dipilih akan dilepas.
                  Karyawan di shift lain yang tidak dipilih tidak berubah.
                </p>

                {isEmptyAssignment && (
                  <label className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                    <input
                      type="checkbox"
                      checked={confirmEmpty}
                      onChange={(event) => setConfirmEmpty(event.target.checked)}
                      disabled={isSubmitting}
                      className="mt-0.5 h-4 w-4"
                    />
                    <span className="text-sm leading-snug">
                      Saya memahami bahwa menyimpan tanpa pilihan akan menghapus semua anggota dari shift ini.
                    </span>
                  </label>
                )}
              </>
            )}

            {feedback && <InlineNotice type={feedback.type} message={feedback.message} />}
          </div>

          <footer className="flex justify-end gap-2 border-t bg-muted/20 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 rounded-md border px-4 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {feedback?.type === 'success' ? 'Tutup' : 'Batal'}
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !selectedShiftId ||
                hasBlockingDataError ||
                (isEmptyAssignment && !confirmEmpty)
              }
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Penugasan'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function InlineNotice({ type, message }: Feedback) {
  const success = type === 'success';
  const Icon = success ? CheckCircle2 : AlertCircle;

  return (
    <div
      role={success ? 'status' : 'alert'}
      className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${
        success
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
          : 'border-destructive/25 bg-destructive/5 text-destructive'
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
