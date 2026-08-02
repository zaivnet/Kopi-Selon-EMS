import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Download, Upload, Printer, Search, Edit, Trash2, ShieldOff, ShieldCheck, KeyRound, Image as ImageIcon, Trash } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import EmployeeFormModal from './components/EmployeeFormModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import PhotoUploadModal from './components/PhotoUploadModal';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useAuth } from '@/context/AuthContext';

export default function EmployeeListPage() {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: employees = [], isLoading, refetch } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data;
    }
  });

  const filteredEmployees = (Array.isArray(employees) ? employees : []).filter((emp: any) => {
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
    const username = (emp.user?.username || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    return fullName.includes(query) || username.includes(query);
  });

  const handleExport = () => {
    const exportData = employees.map((emp: any) => ({
      'Nama Karyawan': `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
      'Jenis Kelamin': emp.gender === 'L' ? 'Laki-laki' : emp.gender === 'P' ? 'Perempuan' : (emp.gender || '-'),
      'Nomor HP': emp.phone || '-',
      'Alamat': emp.address || '-',
      'Status': emp.status,
      'Gaji Pokok': emp.baseSalary || 0,
      'Role': emp.user?.role?.name === 'Administrator' ? 'Admin' : (emp.user?.role?.name || '-'),
      'Username': emp.user?.username || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, `Data_Karyawan_${dayjs().format('YYYYMMDD')}.xlsx`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      try {
        const employeesToImport = data.map((row: any) => ({
          firstName: row['Nama Depan'] || row['Nama Karyawan'] || '',
          lastName: row['Nama Belakang'] || '',
          phone: row['Telepon'] || row['Nomor HP'] || '',
          address: row['Alamat'] || '',
          joinDate: row['Tanggal Bergabung'] || null,
          gender: row['Gender'] || row['Jenis Kelamin'] || '',
          baseSalary: row['Gaji Pokok'] || 0,
          status: row['Status'] || 'ACTIVE',
          shiftName: row['Shift'] || '',
          outletName: row['Cabang'] || '',
          username: row['Username'] || '',
          password: row['Password'] || '123456'
        })).filter(emp => emp.username && emp.firstName);

        if (employeesToImport.length === 0) {
          alert("Tidak ada data karyawan yang valid ditemukan untuk diimpor. Pastikan kolom 'Username' dan nama terisi.");
          return;
        }

        const res = await api.post('/employees/bulk-import', { employees: employeesToImport });
        alert(res.data?.message || `Berhasil mengimpor ${res.data?.createdCount} karyawan.`);
        refetch();
      } catch (error: any) {
        console.error("Import failed:", error);
        alert(error.response?.data?.message || "Gagal mengimpor data karyawan.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus karyawan ini? Data akan dihapus secara soft-delete.')) {
      try {
        await api.delete(`/employees/${id}`);
        refetch();
      } catch (err) {
        alert('Gagal menghapus data');
      }
    }
  };

  const handleToggleStatus = async (emp: any) => {
    const newStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (confirm(`Apakah Anda yakin ingin ${newStatus === 'ACTIVE' ? 'mengaktifkan' : 'menonaktifkan'} karyawan ini?`)) {
      try {
        await api.put(`/employees/${emp.id}`, { status: newStatus });
        refetch();
      } catch (err) {
        alert('Gagal mengubah status');
      }
    }
  };

  const handleSelectEmployee = (employeeId: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(employeeId)) {
      newSelectedIds.delete(employeeId);
    } else {
      newSelectedIds.add(employeeId);
    }
    setSelectedIds(newSelectedIds);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmployees.map((emp: any) => emp.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.size} karyawan yang dipilih? Data akan dihapus secara soft-delete.`)) {
      setIsDeleting(true);
      try {
        const deletePromises = Array.from(selectedIds).map(id =>
          api.delete(`/employees/${id}`)
        );
        await Promise.all(deletePromises);
        setSelectedIds(new Set());
        refetch();
        alert(`${selectedIds.size} karyawan berhasil dihapus.`);
      } catch (err) {
        alert('Gagal menghapus beberapa atau semua karyawan');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Karyawan</h1>
          <p className="text-muted-foreground">Kelola data karyawan KOPI SELON.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {selectedIds.size > 0 && hasPermission('employee.delete') && (
            <button 
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow hover:bg-destructive/90 h-9 px-4 py-2"
            >
              <Trash className="mr-2 h-4 w-4" /> 
              Hapus {selectedIds.size} Karyawan
            </button>
          )}
          {hasPermission('employee.create') && (
            <button onClick={() => { setSelectedEmployee(null); setIsFormOpen(true); }} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
              <Plus className="mr-2 h-4 w-4" /> Tambah Karyawan
            </button>
          )}
          {hasPermission('employee.create') && (
            <>
              <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                <Upload className="mr-2 h-4 w-4" /> Import
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImport} />
            </>
          )}
          {hasPermission('reports.export') && (
            <button onClick={handleExport} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
              <Download className="mr-2 h-4 w-4" /> Export
            </button>
          )}
          {hasPermission('reports.print') && (
            <button onClick={handlePrint} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
              <Printer className="mr-2 h-4 w-4" /> Cetak
            </button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="py-4 print:hidden">
          <div className="flex items-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari karyawan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr className="text-left font-medium text-muted-foreground">
                  <th className="h-10 px-4 align-middle w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === filteredEmployees.length}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < filteredEmployees.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="h-10 px-4 align-middle">Profil</th>
                  <th className="h-10 px-4 align-middle">Nama Karyawan</th>
                  <th className="h-10 px-4 align-middle">Role</th>
                  <th className="h-10 px-4 align-middle">Cabang (Outlet)</th>
                  <th className="h-10 px-4 align-middle">Jenis Kelamin</th>
                  <th className="h-10 px-4 align-middle">Status</th>
                  <th className="h-10 px-4 align-middle text-right print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="p-4 text-center">Loading...</td></tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr><td colSpan={8} className="p-4 text-center">Data tidak ditemukan</td></tr>
                ) : (
                  filteredEmployees.map((emp: any) => (
                    <tr key={emp.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(emp.id)}
                          onChange={() => handleSelectEmployee(emp.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="p-4 align-middle">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                          {emp.photoUrl ? (
                            <img src={emp.photoUrl} alt={emp.firstName} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-secondary-foreground font-medium">{emp.firstName.charAt(0)}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="font-medium">{emp.firstName} {emp.lastName || ''}</div>
                        <div className="text-xs text-muted-foreground">@{emp.user?.username || '-'}</div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                          {emp.user?.role?.name === 'Administrator' ? 'Admin' : (emp.user?.role?.name || '-')}
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                          {emp.outlet?.name || 'Selon 1'}
                        </span>
                      </td>
                      <td className="p-4 align-middle">
                        {emp.gender === 'L' ? 'Laki-laki' : emp.gender === 'P' ? 'Perempuan' : '-'}
                      </td>
                      <td className="p-4 align-middle">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${emp.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-destructive/10 text-destructive'}`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-right print:hidden">
                        <div className="flex items-center justify-end gap-2">
                          {hasPermission('employee.edit') && (
                            <button onClick={() => { setSelectedEmployee(emp); setIsPhotoOpen(true); }} className="p-2 hover:bg-secondary rounded-md" title="Upload Foto">
                              <ImageIcon className="h-4 w-4" />
                            </button>
                          )}
                          {hasPermission('user_management.reset_password') && (
                            <button onClick={() => { setSelectedEmployee(emp); setIsResetPasswordOpen(true); }} className="p-2 hover:bg-secondary rounded-md" title="Reset Password">
                              <KeyRound className="h-4 w-4" />
                            </button>
                          )}
                          {hasPermission('employee.delete') && (
                            <button onClick={() => handleToggleStatus(emp)} className="p-2 hover:bg-secondary rounded-md" title={emp.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}>
                              {emp.status === 'ACTIVE' ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                            </button>
                          )}
                          {hasPermission('employee.edit') && (
                            <button onClick={() => { setSelectedEmployee(emp); setIsFormOpen(true); }} className="p-2 hover:bg-secondary rounded-md" title="Edit">
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {hasPermission('employee.delete') && (
                            <button onClick={() => handleDelete(emp.id)} className="p-2 hover:bg-destructive/10 text-destructive rounded-md" title="Hapus">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {isFormOpen && (
        <EmployeeFormModal
          employee={selectedEmployee}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => { setIsFormOpen(false); refetch(); }}
        />
      )}

      {isResetPasswordOpen && selectedEmployee && (
        <ResetPasswordModal
          employee={selectedEmployee}
          onClose={() => setIsResetPasswordOpen(false)}
        />
      )}

      {isPhotoOpen && selectedEmployee && (
        <PhotoUploadModal
          employee={selectedEmployee}
          onClose={() => setIsPhotoOpen(false)}
          onSuccess={() => { setIsPhotoOpen(false); refetch(); }}
        />
      )}
    </div>
  );
}
