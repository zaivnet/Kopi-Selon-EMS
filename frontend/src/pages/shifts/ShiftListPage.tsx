import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import ShiftFormModal from './components/ShiftFormModal';
import AssignShiftModal from './components/AssignShiftModal';
import AdminShiftWorkspace from './components/AdminShiftWorkspace';
import StaffShiftWorkspace from './components/StaffShiftWorkspace';
import OwnerShiftWorkspace from './components/OwnerShiftWorkspace';
import EmployeeShiftWorkspace from './components/EmployeeShiftWorkspace';
import { RefreshCw } from 'lucide-react';

export default function ShiftListPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const { user, hasPermission, refreshUser } = useAuth();
  const [permissionsReady, setPermissionsReady] = useState(false);

  useEffect(() => {
    refreshUser()
      .catch(() => {
        // ignore refresh errors in UI load
      })
      .finally(() => setPermissionsReady(true));
  }, []);

  // Fetch shifts
  const {
    data: shifts = [],
    isLoading: loadingShifts,
    refetch: refetchShifts,
  } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const res = await api.get('/shifts');
      return res.data;
    },
  });

  // Fetch employees (only if user has permission to view employee list)
  const canViewEmployees = hasPermission('employee.view');
  const {
    data: employees = [],
    isLoading: loadingEmployees,
    refetch: refetchEmployees,
  } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data;
    },
    enabled: canViewEmployees,
  });

  const refetchAll = () => {
    refetchShifts();
    if (canViewEmployees) refetchEmployees();
  };

  const handleDeleteShift = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus shift ini?')) {
      try {
        await api.delete(`/shifts/${id}`);
        refetchAll();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Gagal menghapus shift');
      }
    }
  };

  if (!permissionsReady || loadingShifts || (canViewEmployees && loadingEmployees)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin text-[#6F4E37]" /> Memuat data workspace shift...
        </div>
      </div>
    );
  }

  const canCreateShift = hasPermission('shift.create');
  const canEditShift = hasPermission('shift.edit');
  const canDeleteShift = hasPermission('shift.delete');
  const canViewShift = hasPermission('shift.view');
  const isAdminWorkspace = canCreateShift && canEditShift && canDeleteShift;
  const isStaffWorkspace = !isAdminWorkspace && (canCreateShift || canEditShift);
  const isOwnerWorkspace = !isAdminWorkspace && !isStaffWorkspace && canViewShift;

  return (
    <div>
      {isAdminWorkspace && (
        <AdminShiftWorkspace
          shifts={shifts}
          employees={employees}
          onAddShift={() => {
            setSelectedShift(null);
            setIsFormOpen(true);
          }}
          onEditShift={(shift) => {
            setSelectedShift(shift);
            setIsFormOpen(true);
          }}
          onDeleteShift={handleDeleteShift}
          onAssignShift={() => setIsAssignOpen(true)}
        />
      )}

      {isStaffWorkspace && (
        <StaffShiftWorkspace
          shifts={shifts}
          employees={employees}
          canAssign={canEditShift}
          canCreate={canCreateShift}
          onAssignClick={() => setIsAssignOpen(true)}
          onAddShift={canCreateShift ? () => {
            setSelectedShift(null);
            setIsFormOpen(true);
          } : undefined}
        />
      )}

      {isOwnerWorkspace && <OwnerShiftWorkspace shifts={shifts} employees={employees} />}

      {!isAdminWorkspace && !isStaffWorkspace && isOwnerWorkspace && null}
      {!isAdminWorkspace && !isStaffWorkspace && !isOwnerWorkspace && canViewShift && <EmployeeShiftWorkspace user={user} />}

      {/* Modals for Create/Edit and Assign */}
      {isFormOpen && (
        <ShiftFormModal
          shift={selectedShift}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            refetchAll();
          }}
        />
      )}

      {isAssignOpen && (
        <AssignShiftModal
          shifts={shifts}
          onClose={() => setIsAssignOpen(false)}
          onSuccess={() => refetchAll()}
        />
      )}
    </div>
  );
}
