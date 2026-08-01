import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  ShieldCheck,
  Crown,
  Users,
  UserCheck,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  RotateCcw,
  Maximize2,
  Minimize2,
  Check,
  X,
  Search,
  Lock,
  Sparkles,
  Info,
  CheckCircle2,
  LayoutDashboard,
  User,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Megaphone,
  Building,
  Settings,
  History,
  Database,
  UserCog
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge, Button } from '@/components/ui/design-system';

// Define permission structure
export type PermissionItem = {
  id: string;
  label: string;
  description?: string;
};

export type ModulePermissionGroup = {
  id: string;
  name: string;
  icon: any;
  description: string;
  permissions: PermissionItem[];
};

// 12 Modules specified in requirement
export const MODULE_PERMISSIONS: ModulePermissionGroup[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Akses ke ringkasan dan statistik dashboard',
    permissions: [
      { id: 'dashboard.view', label: 'View', description: 'Melihat widget & indikator utama dashboard' }
    ]
  },
  {
    id: 'employee',
    name: 'Employee',
    icon: User,
    description: 'Manajemen data profil dan direktori karyawan',
    permissions: [
      { id: 'employee.view', label: 'View', description: 'Melihat daftar dan detail karyawan' },
      { id: 'employee.create', label: 'Create', description: 'Menambah data karyawan baru' },
      { id: 'employee.edit', label: 'Edit', description: 'Mengubah data karyawan' },
      { id: 'employee.delete', label: 'Delete', description: 'Menghapus/nonaktifkan data karyawan' }
    ]
  },
  {
    id: 'attendance',
    name: 'Attendance',
    icon: Calendar,
    description: 'Manajemen absensi, presensi, dan selfie karyawan',
    permissions: [
      { id: 'attendance.view', label: 'View', description: 'Melihat log absensi' },
      { id: 'attendance.create', label: 'Create', description: 'Melakukan absensi selfie / input' },
      { id: 'attendance.edit', label: 'Edit', description: 'Koreksi atau ubah jam absensi' },
      { id: 'attendance.delete', label: 'Delete', description: 'Menghapus data absensi' },
      { id: 'attendance.export', label: 'Export', description: 'Ekspor laporan absensi ke Excel/PDF' }
    ]
  },
  {
    id: 'shift',
    name: 'Shift',
    icon: Clock,
    description: 'Pengaturan jadwal kerja dan penugasan shift',
    permissions: [
      { id: 'shift.view', label: 'View', description: 'Melihat master shift dan penugasan' },
      { id: 'shift.create', label: 'Create', description: 'Membuat jam shift baru' },
      { id: 'shift.edit', label: 'Edit', description: 'Mengubah jam dan penugasan shift' },
      { id: 'shift.delete', label: 'Delete', description: 'Menghapus data shift' }
    ]
  },
  {
    id: 'request_center',
    name: 'Request Center',
    icon: FileText,
    description: 'Pengajuan cuti, izin, sakit, dan tukar shift karyawan',
    permissions: [
      { id: 'request_center.view', label: 'View', description: 'Melihat daftar dan detail pengajuan' },
      { id: 'request_center.create', label: 'Create', description: 'Membuat pengajuan cuti, izin, & tukar shift' },
      { id: 'request_center.approve', label: 'Approve', description: 'Menyetujui atau menolak pengajuan' }
    ]
  },
  {
    id: 'salary',
    name: 'Salary',
    icon: DollarSign,
    description: 'Penggajian, hitung insentif, potongan, dan approval',
    permissions: [
      { id: 'salary.view', label: 'View', description: 'Melihat aturan gaji dan riwayat penggajian' },
      { id: 'salary.calculate', label: 'Calculate', description: 'Kalkulasi otomatis gaji bulanan' },
      { id: 'salary.approve', label: 'Approve', description: 'Menyetujui pencairan slip gaji' },
      { id: 'salary.export', label: 'Export', description: 'Cetak dan ekspor rekap penggajian' }
    ]
  },
  {
    id: 'reports',
    name: 'Reports',
    icon: FileText,
    description: 'Laporan komprehensif kehadiran, kerja, dan payroll',
    permissions: [
      { id: 'reports.view', label: 'View', description: 'Melihat ringkasan laporan' },
      { id: 'reports.export', label: 'Export', description: 'Mengekspor laporan ke dokumen spreadsheet' },
      { id: 'reports.print', label: 'Print', description: 'Mencetak dokumen cetak laporan' }
    ]
  },
  {
    id: 'announcements',
    name: 'Announcements',
    icon: Megaphone,
    description: 'Pengumuman internal perusahaan dan kabar warkop',
    permissions: [
      { id: 'announcements.view', label: 'View', description: 'Melihat daftar pengumuman' },
      { id: 'announcements.create', label: 'Create', description: 'Membuat pesan pengumuman baru' },
      { id: 'announcements.edit', label: 'Edit', description: 'Mengubah pengumuman' },
      { id: 'announcements.delete', label: 'Delete', description: 'Menghapus pengumuman' }
    ]
  },
  {
    id: 'company_profile',
    name: 'Company Profile',
    icon: Building,
    description: 'Profil usaha KOPI SELON, jam operasional, dan lokasi',
    permissions: [
      { id: 'company_profile.view', label: 'View', description: 'Melihat profil perusahaan' },
      { id: 'company_profile.edit', label: 'Edit', description: 'Mengubah profil, peta, dan kontak' }
    ]
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    description: 'Pengaturan sistem, parameter absensi, dan preferensi UI',
    permissions: [
      { id: 'settings.view', label: 'View', description: 'Melihat pengaturan umum' },
      { id: 'settings.edit', label: 'Edit', description: 'Mengubah konfigurasi sistem' }
    ]
  },
  {
    id: 'audit_log',
    name: 'Audit Log',
    icon: History,
    description: 'Catatan jejak aktivitas user dan log keamanan',
    permissions: [
      { id: 'audit_log.view', label: 'View', description: 'Melihat log riwayat aktivitas' }
    ]
  },
  {
    id: 'backup_restore',
    name: 'Backup & Restore',
    icon: Database,
    description: 'Pencadangan database dan pemulihan data sistem',
    permissions: [
      { id: 'backup_restore.backup', label: 'Backup', description: 'Mengunduh atau membuat file backup' },
      { id: 'backup_restore.restore', label: 'Restore', description: 'Memulihkan database dari backup' }
    ]
  },
  {
    id: 'user_management',
    name: 'User Management',
    icon: UserCog,
    description: 'Kelola kredensial akun login dan reset akses',
    permissions: [
      { id: 'user_management.create_user', label: 'Create User', description: 'Mendaftarkan akun pengguna baru' },
      { id: 'user_management.edit_user', label: 'Edit User', description: 'Mengubah data login pengguna' },
      { id: 'user_management.delete_user', label: 'Delete User', description: 'Menghapus akun pengguna' },
      { id: 'user_management.reset_password', label: 'Reset Password', description: 'Setel ulang kata sandi pengguna' }
    ]
  }
];

// Calculate total permissions available
export const ALL_PERMISSION_IDS = MODULE_PERMISSIONS.flatMap(m => m.permissions.map(p => p.id));
export const TOTAL_PERMISSIONS_COUNT = ALL_PERMISSION_IDS.length;

// Role definitions
export type RoleData = {
  id: string;
  name: string;
  badge: string;
  icon: any;
  colorTheme: {
    bgGradient: string;
    borderColor: string;
    iconBg: string;
    iconColor: string;
    badgeVariant: 'warning' | 'info' | 'success' | 'default';
  };
  description: string;
  defaultPermissions: string[];
};

export const INITIAL_ROLES: RoleData[] = [
  {
    id: 'role-administrator',
    name: 'Administrator',
    badge: 'Super Admin',
    icon: Crown,
    colorTheme: {
      bgGradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
      borderColor: 'border-amber-500/30 hover:border-amber-500/60',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/25',
      iconColor: 'text-amber-600 dark:text-amber-400',
      badgeVariant: 'warning'
    },
    description: 'Akses penuh tanpa batasan ke seluruh modul sistem, penugasan role, dan fungsi manajemen tingkat tinggi.',
    defaultPermissions: ALL_PERMISSION_IDS // All 36 permissions
  },
  {
    id: 'role-owner',
    name: 'Owner',
    badge: 'Pemilik Usaha',
    icon: ShieldCheck,
    colorTheme: {
      bgGradient: 'from-purple-500/10 via-indigo-500/5 to-transparent',
      borderColor: 'border-purple-500/30 hover:border-purple-500/60',
      iconBg: 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-purple-500/25',
      iconColor: 'text-purple-600 dark:text-purple-400',
      badgeVariant: 'info'
    },
    description: 'Akses pemantauan operasional bisnis, laporan keuangan, penggajian, dan audit log tanpa akses teknis backup/restore.',
    defaultPermissions: [
      'dashboard.view',
      'employee.view', 'employee.create', 'employee.edit',
      'attendance.view', 'attendance.export',
      'shift.view',
      'request_center.view', 'request_center.create', 'request_center.approve',
      'salary.view', 'salary.calculate', 'salary.approve', 'salary.export',
      'reports.view', 'reports.export', 'reports.print',
      'announcements.view', 'announcements.create', 'announcements.edit', 'announcements.delete',
      'company_profile.view', 'company_profile.edit',
      'settings.view',
      'audit_log.view',
      'user_management.create_user', 'user_management.edit_user', 'user_management.reset_password'
    ]
  },
  {
    id: 'role-staff',
    name: 'Staff',
    badge: 'Supervisor / Kasir',
    icon: Users,
    colorTheme: {
      bgGradient: 'from-blue-500/10 via-sky-500/5 to-transparent',
      borderColor: 'border-blue-500/30 hover:border-blue-500/60',
      iconBg: 'bg-gradient-to-br from-blue-600 to-sky-600 text-white shadow-blue-500/25',
      iconColor: 'text-blue-600 dark:text-blue-400',
      badgeVariant: 'info'
    },
    description: 'Akses pengelolaan operasional harian, pendaftaran karyawan, pembuatan shift kerja, serta input absensi.',
    defaultPermissions: [
      'dashboard.view',
      'employee.view', 'employee.create', 'employee.edit',
      'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.export',
      'shift.view', 'shift.create', 'shift.edit',
      'request_center.view', 'request_center.create', 'request_center.approve',
      'reports.view', 'reports.export',
      'announcements.view', 'announcements.create',
      'company_profile.view'
    ]
  },
  {
    id: 'role-karyawan',
    name: 'Karyawan',
    badge: 'Anggota Tim',
    icon: UserCheck,
    colorTheme: {
      bgGradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
      borderColor: 'border-emerald-500/30 hover:border-emerald-500/60',
      iconBg: 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-emerald-500/25',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      badgeVariant: 'success'
    },
    description: 'Akses mandiri untuk melakukan absensi selfie, melihat jadwal shift, membaca pengumuman, dan melihat slip gaji.',
    defaultPermissions: [
      'dashboard.view',
      'attendance.view', 'attendance.create',
      'shift.view',
      'request_center.view', 'request_center.create',
      'salary.view',
      'announcements.view'
    ]
  }
];

export default function RolePermissionsPage() {
  const { refreshUser } = useAuth();
  // Fetch roles with permissions from backend DB
  const { data: fetchedRoles, refetch: refetchRoles } = useQuery({
    queryKey: ['rolesWithPermissions'],
    queryFn: async () => {
      const res = await api.get('/roles');
      return res.data;
    }
  });

  // Store permissions per role
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({
    Administrator: [...INITIAL_ROLES[0].defaultPermissions],
    Owner: [...INITIAL_ROLES[1].defaultPermissions],
    Staff: [...INITIAL_ROLES[2].defaultPermissions],
    Karyawan: [...INITIAL_ROLES[3].defaultPermissions]
  });

  // Sync state from DB fetched roles
  useEffect(() => {
    if (!Array.isArray(fetchedRoles)) return;

    setRolePermissions((prev) => {
      const nextMap: Record<string, string[]> = { ...prev };
      fetchedRoles.forEach((roleObj: any) => {
        if (Array.isArray(roleObj.permissions)) {
          nextMap[roleObj.name] = roleObj.permissions;
        }
      });
      return nextMap;
    });
  }, [fetchedRoles]);

  // Drawer state
  const [activeRoleName, setActiveRoleName] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    dashboard: true,
    employee: true,
    attendance: true,
    shift: true
  });
  const [drawerSearch, setDrawerSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeRoleData = useMemo(() => {
    return INITIAL_ROLES.find(r => r.name === activeRoleName) || null;
  }, [activeRoleName]);

  const handleOpenDrawer = (roleName: string) => {
    setActiveRoleName(roleName);
    setEditingPermissions([...(rolePermissions[roleName] || [])]);
    setDrawerSearch('');
    // Default open all modules
    const allExpanded: Record<string, boolean> = {};
    MODULE_PERMISSIONS.forEach(m => { allExpanded[m.id] = true; });
    setExpandedModules(allExpanded);
  };

  const handleCloseDrawer = () => {
    setActiveRoleName(null);
    setEditingPermissions([]);
  };

  const handleTogglePermission = (permId: string) => {
    setEditingPermissions(current =>
      current.includes(permId) ? current.filter(id => id !== permId) : [...current, permId]
    );
  };

  const handleToggleModulePermissions = (moduleGroup: ModulePermissionGroup) => {
    const modulePermIds = moduleGroup.permissions.map(p => p.id);
    const allChecked = modulePermIds.every(id => editingPermissions.includes(id));

    if (allChecked) {
      setEditingPermissions(current => current.filter(id => !modulePermIds.includes(id)));
    } else {
      setEditingPermissions(current => Array.from(new Set([...current, ...modulePermIds])));
    }
  };

  const handleExpandAll = () => {
    const nextState: Record<string, boolean> = {};
    MODULE_PERMISSIONS.forEach(m => { nextState[m.id] = true; });
    setExpandedModules(nextState);
  };

  const handleCollapseAll = () => {
    const nextState: Record<string, boolean> = {};
    MODULE_PERMISSIONS.forEach(m => { nextState[m.id] = false; });
    setExpandedModules(nextState);
  };

  const handleCheckAll = () => {
    setEditingPermissions([...ALL_PERMISSION_IDS]);
  };

  const handleUncheckAll = () => {
    setEditingPermissions([]);
  };

  const handleResetDefault = () => {
    if (!activeRoleData) return;
    setEditingPermissions([...activeRoleData.defaultPermissions]);
    showToast(`Permission role ${activeRoleData.name} dikembalikan ke default.`);
  };

  const handleSaveChanges = async () => {
    if (!activeRoleName) return;
    try {
      const targetRole = Array.isArray(fetchedRoles) ? fetchedRoles.find((r: any) => r.name === activeRoleName) : null;
      const roleIdOrName = targetRole?.id || activeRoleName;
      
      await api.put(`/roles/${roleIdOrName}/permissions`, {
        permissions: editingPermissions
      });
      
      await refreshUser();
      await refetchRoles();

      setRolePermissions(prev => ({
        ...prev,
        [activeRoleName]: [...editingPermissions]
      }));
      showToast(`Hak akses role ${activeRoleName} berhasil disimpan ke database!`);
      handleCloseDrawer();
    } catch (err: any) {
      showToast(`Gagal menyimpan: ${err.response?.data?.message || err.message}`);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => { setToastMessage(null); }, 3500);
  };

  const toggleAccordion = (moduleId: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  // Filter modules inside drawer based on search
  const filteredModules = useMemo(() => {
    if (!drawerSearch.trim()) return MODULE_PERMISSIONS;
    const query = drawerSearch.toLowerCase();
    return MODULE_PERMISSIONS.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.description.toLowerCase().includes(query) ||
      m.permissions.some(p => p.label.toLowerCase().includes(query) || p.id.toLowerCase().includes(query))
    );
  }, [drawerSearch]);

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[100] flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/90 text-emerald-100 px-5 py-3.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-semibold">{toastMessage}</p>
          <button onClick={() => setToastMessage(null)} className="ml-2 rounded-lg p-1 hover:bg-emerald-900/50">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6F4E37] to-[#A07855] text-white shadow-md">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-amber-100">Role & Permissions</h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-amber-200/60">
                Kelola hak akses granular berbasis Role. Perubahan otomatis berlaku untuk seluruh pengguna dengan role terkait.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="neutral" className="px-3 py-1.5 text-xs">
            <Lock className="h-3.5 w-3.5 mr-1" /> Role Tetap (Fixed System Roles)
          </Badge>
        </div>
      </div>

      {/* Modern Notice Banner */}
      <div className="relative overflow-hidden rounded-[24px] border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 p-4 sm:p-5 backdrop-blur-xl dark:border-amber-900/40">
        <div className="flex items-start gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="text-xs sm:text-sm text-slate-700 dark:text-amber-200/80 leading-relaxed">
            <p className="font-bold text-amber-900 dark:text-amber-100">Konsep Hak Akses Berbasis Role</p>
            <p className="mt-0.5">
              Hak akses sistem tidak diatur per pengguna individual. Setiap karyawan memiliki 1 Role. Mengubah permission pada suatu Role akan secara otomatis memperbarui izin akses seluruh karyawan yang memegang Role tersebut secara real-time.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {INITIAL_ROLES.map((role) => {
          const Icon = role.icon;
          const currentPerms = rolePermissions[role.name] || [];
          const permCount = currentPerms.length;
          const percentage = Math.round((permCount / TOTAL_PERMISSIONS_COUNT) * 100);

          return (
            <Card
              key={role.id}
              className={`group relative overflow-hidden rounded-[28px] border bg-gradient-to-br ${role.colorTheme.bgGradient} p-6 backdrop-blur-xl transition-all duration-300 ${role.colorTheme.borderColor} shadow-lg hover:shadow-2xl hover:-translate-y-1`}
            >
              {/* Header inside Card */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${role.colorTheme.iconBg} shadow-lg`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-amber-100">{role.name}</h2>
                      <Badge variant={role.colorTheme.badgeVariant} className="text-[10px] uppercase">
                        {role.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-amber-200/60 mt-0.5 font-medium">Role Sistem Tetap</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-flex items-center rounded-full bg-slate-900/10 px-3 py-1 text-xs font-bold text-slate-800 dark:bg-amber-950/50 dark:text-amber-200 border border-slate-300/30 dark:border-amber-800/40">
                    {permCount} / {TOTAL_PERMISSIONS_COUNT} Permission
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-5 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-amber-200/70">
                  <span>Cakupan Akses</span>
                  <span>{percentage}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {/* Description */}
              <p className="mt-4 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-amber-200/75 min-h-[40px]">
                {role.description}
              </p>

              {/* Action Button */}
              <div className="mt-6 flex items-center justify-between border-t border-slate-200/50 dark:border-amber-900/30 pt-4">
                <span className="text-xs font-semibold text-slate-500 dark:text-amber-300/60 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" /> Klik edit untuk kelola izin
                </span>

                <Button
                  onClick={() => handleOpenDrawer(role.name)}
                  className="rounded-2xl shadow-md transition-all hover:scale-105"
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" /> Edit Permission
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Drawer Overlay & Panel */}
      {activeRoleName && activeRoleData && (
        <div className="fixed inset-0 z-[90] flex justify-end overflow-hidden bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={handleCloseDrawer} />

          {/* Drawer Container */}
          <aside className="relative flex h-full w-full max-w-2xl flex-col bg-[#fffaf3] dark:bg-[#18110d] border-l border-amber-200/80 dark:border-[#4b3628] shadow-2xl z-10 animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="flex shrink-0 items-start justify-between border-b border-amber-200/70 bg-[#fffaf3]/95 px-6 py-5 dark:border-[#3e2e24] dark:bg-[#18110d]/95 backdrop-blur-md">
              <div className="flex items-center gap-3.5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${activeRoleData.colorTheme.iconBg} shadow-md`}>
                  <activeRoleData.icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-[#3f2a1d] dark:text-amber-100">{activeRoleData.name}</h2>
                    <Badge variant="success" className="text-[10px]">Aktif</Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-amber-200/60 mt-0.5 max-w-md line-clamp-1">
                    {activeRoleData.description}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseDrawer}
                className="rounded-xl p-2 text-slate-400 hover:bg-amber-100 hover:text-slate-800 dark:hover:bg-amber-950/40 dark:hover:text-amber-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Action Toolbar */}
            <div className="shrink-0 border-b border-amber-200/60 bg-amber-500/5 px-6 py-3 dark:border-[#3e2e24] dark:bg-amber-950/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Button type="button" variant="ghost" size="sm" onClick={handleExpandAll} title="Buka Semua Accordion">
                    <Maximize2 className="h-3.5 w-3.5" /> Expand All
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={handleCollapseAll} title="Tutup Semua Accordion">
                    <Minimize2 className="h-3.5 w-3.5" /> Collapse All
                  </Button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button type="button" variant="outline" size="sm" onClick={handleCheckAll} title="Centang Semua Permission">
                    <CheckSquare className="h-3.5 w-3.5" /> Check All
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleUncheckAll} title="Kosongkan Semua Centang">
                    <Square className="h-3.5 w-3.5" /> Uncheck All
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={handleResetDefault} title="Reset ke Standar Default Role">
                    <RotateCcw className="h-3.5 w-3.5" /> Reset Default
                  </Button>
                </div>
              </div>

              {/* Search Bar inside Drawer */}
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-amber-400/60" />
                <input
                  type="text"
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  placeholder="Cari nama modul atau nama hak akses..."
                  className="w-full h-9 pl-9 pr-4 rounded-xl border border-amber-500/20 bg-white dark:bg-[#221812] dark:border-[#3e2e24] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              {/* Counter Badge */}
              <div className="mt-2.5 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-amber-200/70">
                  Terpilih: <strong className="text-amber-700 dark:text-amber-300">{editingPermissions.length}</strong> dari {TOTAL_PERMISSIONS_COUNT} Hak Akses
                </span>
                <span className="text-[#6F4E37] dark:text-amber-400 font-mono">
                  {Math.round((editingPermissions.length / TOTAL_PERMISSIONS_COUNT) * 100)}% Diizinkan
                </span>
              </div>
            </div>

            {/* Accordion Permission List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {filteredModules.length === 0 ? (
                <div className="text-center py-10 text-slate-500 dark:text-amber-300/60 text-xs sm:text-sm">
                  Tidak ditemukan permission yang sesuai dengan kata kunci pencarian.
                </div>
              ) : (
                filteredModules.map((moduleGroup) => {
                  const Icon = moduleGroup.icon;
                  const isExpanded = !!expandedModules[moduleGroup.id];
                  const modulePermIds = moduleGroup.permissions.map(p => p.id);
                  const checkedCount = modulePermIds.filter(id => editingPermissions.includes(id)).length;
                  const isAllModuleChecked = checkedCount === modulePermIds.length && modulePermIds.length > 0;
                  const isSomeModuleChecked = checkedCount > 0 && checkedCount < modulePermIds.length;

                  return (
                    <div
                      key={moduleGroup.id}
                      className="overflow-hidden rounded-2xl border border-amber-500/20 bg-white/70 dark:border-[#3e2e24] dark:bg-[#221812]/90 shadow-sm transition-all"
                    >
                      {/* Accordion Header */}
                      <div className="flex items-center justify-between px-4 py-3.5 bg-amber-500/5 dark:bg-amber-950/20 hover:bg-amber-500/10 dark:hover:bg-amber-950/40 transition">
                        <button
                          type="button"
                          onClick={() => toggleAccordion(moduleGroup.id)}
                          className="flex flex-1 items-center gap-3 text-left outline-none"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                          )}

                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800 dark:bg-amber-500/25 dark:text-amber-200 font-bold shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>

                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-amber-100">{moduleGroup.name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-amber-200/60 line-clamp-1">
                              {moduleGroup.description}
                            </p>
                          </div>
                        </button>

                        <div className="flex items-center gap-3 pl-3 border-l border-amber-500/15 dark:border-amber-900/30">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            isAllModuleChecked
                              ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                              : isSomeModuleChecked
                              ? 'bg-amber-500/20 text-amber-900 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {checkedCount} / {modulePermIds.length}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleModulePermissions(moduleGroup)}
                            title={isAllModuleChecked ? 'Batalkan Semua di Modul Ini' : 'Centang Semua di Modul Ini'}
                            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-amber-500/20 dark:hover:bg-amber-950/40 text-slate-600 dark:text-amber-300 transition"
                          >
                            {isAllModuleChecked ? (
                              <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            ) : isSomeModuleChecked ? (
                              <div className="h-3.5 w-3.5 rounded-sm bg-amber-600 dark:bg-amber-400 flex items-center justify-center text-white text-[10px] font-bold">-</div>
                            ) : (
                              <Square className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Accordion Content Body */}
                      {isExpanded && (
                        <div className="p-4 border-t border-amber-500/15 dark:border-[#3e2e24] bg-white/40 dark:bg-[#1a110a]/40">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {moduleGroup.permissions.map((perm) => {
                              const isChecked = editingPermissions.includes(perm.id);

                              return (
                                <label
                                  key={perm.id}
                                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                    isChecked
                                      ? 'border-amber-500/40 bg-amber-500/10 dark:border-amber-700/50 dark:bg-amber-950/30'
                                      : 'border-slate-200/80 bg-white/50 hover:bg-amber-500/5 dark:border-slate-800/80 dark:bg-[#20150e]/60 dark:hover:bg-amber-950/20'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(perm.id)}
                                    className="mt-0.5 h-4 w-4 rounded border-amber-500/30 text-amber-600 focus:ring-amber-500 dark:border-amber-900/50"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-slate-800 dark:text-amber-100">{perm.label}</span>
                                      <span className="text-[10px] font-mono text-slate-400 dark:text-amber-300/40">{perm.id.split('.')[1]}</span>
                                    </div>
                                    {perm.description && (
                                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-amber-200/60 leading-tight">
                                        {perm.description}
                                      </p>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="shrink-0 border-t border-amber-200/70 bg-[#fffaf3]/95 px-6 py-4 dark:border-[#3e2e24] dark:bg-[#18110d]/95 backdrop-blur-md flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={handleCloseDrawer}>
                Cancel
              </Button>
              <Button type="button" variant="default" onClick={handleSaveChanges} className="shadow-lg shadow-amber-600/20">
                <Check className="h-4 w-4 mr-1.5" /> Save Changes
              </Button>
            </div>

          </aside>
        </div>
      )}
    </div>
  );
}
