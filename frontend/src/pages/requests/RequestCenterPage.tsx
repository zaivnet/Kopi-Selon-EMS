import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import {
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  UserCheck,
  XCircle,
  FileCheck,
  History,
  Upload,
  Eye,
  Sparkles,
  CalendarCheck,
  Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import TimelineApproval from '@/components/requests/TimelineApproval';
import SwapShiftDrawer from '@/components/requests/SwapShiftDrawer';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  shift?: Shift;
  user?: { username: string };
}

interface RequestItem {
  id: string;
  requestNumber: string;
  employeeId: string;
  employee: Employee;
  type: 'SWAP_SHIFT' | 'CHANGE_SHIFT' | 'LEAVE' | 'SICK_LEAVE' | 'PERMISSION' | 'OVERTIME';
  permissionType?: 'LATE_ARRIVAL' | 'EARLY_LEAVE' | 'ABSENT';
  startDate: string;
  endDate?: string;
  currentShiftId?: string;
  targetShiftId?: string;
  targetShift?: Shift;
  targetEmployeeId?: string;
  targetEmployee?: Employee;
  peerStatus?: string;
  peerNote?: string;
  reason: string;
  attachmentUrl?: string;
  status: 'Draft' | 'Submitted' | 'Waiting Employee Approval' | 'Waiting Staff Approval' | 'Approved' | 'Rejected' | 'Cancelled';
  reviewerUser?: { username: string; role?: { name: string } };
  reviewerNote?: string;
  reviewedAt?: string;
  timelines: any[];
  auditLogs?: any[];
  createdAt: string;
}

export default function RequestCenterPage() {
  const { user, hasPermission } = useAuth();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [outlets, setOutlets] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedOutlet, setSelectedOutlet] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSwapDrawerOpen, setIsSwapDrawerOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'audit'>('timeline');

  // Action form notes
  const [actionNote, setActionNote] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // New Request Form State
  const [formType, setFormType] = useState<'SWAP_SHIFT' | 'CHANGE_SHIFT' | 'LEAVE' | 'SICK_LEAVE' | 'PERMISSION' | 'OVERTIME'>('SWAP_SHIFT');
  const [formPermissionType, setFormPermissionType] = useState<'LATE_ARRIVAL' | 'EARLY_LEAVE' | 'ABSENT'>('LATE_ARRIVAL');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('17:00');
  const [formEndTime, setFormEndTime] = useState('20:00');
  const [formTargetShiftId, setFormTargetShiftId] = useState('');
  const [formTargetEmployeeId, setFormTargetEmployeeId] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submittingForm, setSubmittingForm] = useState(false);

  const canApproveRequest = hasPermission('request_center.approve');

  const getAuthToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${getAuthToken()}` } });

  const fetchRequests = async () => {
    try {
      setRefreshing(true);
      const res = await axios.get('/api/requests', {
        ...getAuthHeaders(),
        params: {
          type: selectedType,
          status: selectedStatus,
          search: searchQuery,
        },
      });
      setRequests(res.data);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [empRes, shiftRes, outletRes] = await Promise.all([
        axios.get('/api/employees', getAuthHeaders()),
        axios.get('/api/shifts', getAuthHeaders()),
        axios.get('/api/outlets', getAuthHeaders()).catch(() => ({ data: [] })),
      ]);
      setEmployees(empRes.data.filter((e: any) => e.status === 'ACTIVE'));
      setShifts(shiftRes.data);
      setOutlets(Array.isArray(outletRes.data) ? outletRes.data : []);
    } catch (err) {
      console.error('Error fetching dependencies:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchDependencies();
  }, [selectedType, selectedStatus]);

  const filteredRequests = (requests || []).filter((r: any) => {
    if (selectedOutlet === 'ALL') return true;
    const empOutletId = r.employee?.outletId || r.employee?.outlet?.id;
    const empOutletCode = r.employee?.outlet?.code;
    return (
      empOutletId === selectedOutlet ||
      (empOutletCode && empOutletCode.toUpperCase() === selectedOutlet.toUpperCase())
    );
  });

  // ── Shift Preview State ─────────────────────────────────────────
  const [shiftPreview, setShiftPreview] = React.useState<{
    myShift: { name: string; startTime: string; endTime: string; source: string } | null;
    targetShift: { name: string; startTime: string; endTime: string; source: string } | null;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);

  // Auto-fetch shift preview whenever date or targetEmployee changes on SWAP/CHANGE modal
  React.useEffect(() => {
    if (!showCreateModal) return;
    if (!formStartDate) { setShiftPreview(null); return; }
    if (formType !== 'SWAP_SHIFT' && formType !== 'CHANGE_SHIFT') { setShiftPreview(null); return; }

    let cancelled = false;
    const fetchPreview = async () => {
      try {
        setLoadingPreview(true);
        const params: any = { date: formStartDate };
        if (formType === 'SWAP_SHIFT' && formTargetEmployeeId) {
          params.targetEmployeeId = formTargetEmployeeId;
        }
        const res = await axios.get('/api/requests/shift-preview', {
          ...getAuthHeaders(),
          params,
        });
        if (!cancelled) setShiftPreview(res.data);
      } catch {
        if (!cancelled) setShiftPreview(null);
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    };

    fetchPreview();
    return () => { cancelled = true; };
  }, [formStartDate, formTargetEmployeeId, formType, showCreateModal]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRequests();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingFile(true);
      const res = await axios.post('/api/requests/upload-attachment', formData, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setFormAttachmentUrl(res.data.url);
    } catch (err) {
      alert('Gagal mengunggah berkas lampiran.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCreateRequest = async (isDraft = false) => {
    if (!formStartDate || !formReason.trim()) {
      alert('Tanggal dan Alasan wajib diisi.');
      return;
    }

    if (formType === 'SWAP_SHIFT' && !formTargetEmployeeId) {
      alert('Pilih rekan kerja untuk Tukar Shift.');
      return;
    }

    if (formType === 'CHANGE_SHIFT' && !formTargetShiftId) {
      alert('Pilih shift tujuan untuk Ubah Shift.');
      return;
    }

    if (formEndDate && new Date(formEndDate) < new Date(formStartDate)) {
      alert('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    try {
      setSubmittingForm(true);

      let startPayload = formStartDate;
      let endPayload = formEndDate || formStartDate;

      if (formType === 'OVERTIME') {
        startPayload = `${formStartDate}T${formStartTime}:00`;
        const endTemp = `${formStartDate}T${formEndTime}:00`;
        if (formEndTime < formStartTime) {
          const endObj = new Date(endTemp);
          endObj.setDate(endObj.getDate() + 1);
          const pad = (n: number) => String(n).padStart(2, '0');
          endPayload = `${endObj.getFullYear()}-${pad(endObj.getMonth() + 1)}-${pad(endObj.getDate())}T${formEndTime}:00`;
        } else {
          endPayload = endTemp;
        }
      }

      await axios.post(
        '/api/requests',
        {
          type: formType,
          permissionType: formType === 'PERMISSION' ? formPermissionType : null,
          startDate: startPayload,
          endDate: endPayload,
          targetShiftId: formTargetShiftId || null,
          targetEmployeeId: formTargetEmployeeId || null,
          reason: formReason,
          attachmentUrl: formAttachmentUrl || null,
          isDraft,
        },
        getAuthHeaders()
      );

      setShowCreateModal(false);
      resetForm();
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan pengajuan.');
    } finally {
      setSubmittingForm(false);
    }
  };

  const resetForm = () => {
    setFormType('SWAP_SHIFT');
    setFormPermissionType('LATE_ARRIVAL');
    setFormStartDate('');
    setFormEndDate('');
    setFormStartTime('17:00');
    setFormEndTime('20:00');
    setFormTargetShiftId('');
    setFormTargetEmployeeId('');
    setFormReason('');
    setFormAttachmentUrl('');
  };

  const openDetail = async (reqItem: RequestItem) => {
    try {
      const res = await axios.get(`/api/requests/${reqItem.id}`, getAuthHeaders());
      setSelectedRequest(res.data);
      setActionNote('');
      setActiveTab('timeline');
      setShowDetailModal(true);
    } catch (err) {
      alert('Gagal memuat detail pengajuan.');
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      setSubmittingAction(true);
      await axios.post(`/api/requests/${selectedRequest.id}/approve`, { reviewerNote: actionNote }, getAuthHeaders());
      setShowDetailModal(false);
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyetujui pengajuan.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!actionNote.trim()) {
      alert('Masukkan alasan penolakan pada Catatan.');
      return;
    }
    try {
      setSubmittingAction(true);
      await axios.post(`/api/requests/${selectedRequest.id}/reject`, { reviewerNote: actionNote }, getAuthHeaders());
      setShowDetailModal(false);
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menolak pengajuan.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handlePeerRespond = async (action: 'ACCEPT' | 'REJECT') => {
    if (!selectedRequest) return;
    try {
      setSubmittingAction(true);
      await axios.post(
        `/api/requests/${selectedRequest.id}/peer-respond`,
        { action, note: actionNote },
        getAuthHeaders()
      );
      setShowDetailModal(false);
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal memproses persetujuan rekan kerja.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCancel = async (reqId: string) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan pengajuan ini?')) return;
    try {
      await axios.post(`/api/requests/${reqId}/cancel`, {}, getAuthHeaders());
      if (showDetailModal) setShowDetailModal(false);
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal membatalkan pengajuan.');
    }
  };

  // Helper Badge Colors
  const getTypeBadge = (type: string, permType?: string) => {
    switch (type) {
      case 'SWAP_SHIFT':
        return (
          <span className="inline-flex items-center gap-1 rounded-xl bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
            <ArrowLeftRight className="h-3.5 w-3.5" /> Tukar Shift
          </span>
        );
      case 'CHANGE_SHIFT':
        return (
          <span className="inline-flex items-center gap-1 rounded-xl bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <CalendarCheck className="h-3.5 w-3.5" /> Ubah Shift
          </span>
        );
      case 'LEAVE':
        return (
          <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Calendar className="h-3.5 w-3.5" /> Cuti
          </span>
        );
      case 'SICK_LEAVE':
        return (
          <span className="inline-flex items-center gap-1 rounded-xl bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <Stethoscope className="h-3.5 w-3.5" /> Sakit
          </span>
        );
      case 'PERMISSION':
        return (
          <span className="inline-flex items-center gap-1 rounded-xl bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <FileText className="h-3.5 w-3.5" />
            {permType === 'LATE_ARRIVAL'
              ? 'Terlambat'
              : permType === 'EARLY_LEAVE'
              ? 'Pulang Awal'
              : 'Izin Tidak Masuk'}
          </span>
        );
      case 'OVERTIME':
        return (
          <span className="inline-flex items-center gap-1 rounded-xl bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
            <Clock className="h-3.5 w-3.5" /> Lembur
          </span>
        );
      default:
        return <span className="text-xs font-medium">{type}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approved
          </span>
        );
      case 'Waiting Staff Approval':
        return (
          <span className="inline-flex items-center gap-1 rounded-xl bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="h-3.5 w-3.5 animate-pulse" /> Pending Staff
          </span>
        );
      case 'Waiting Employee Approval':
        return (
          <span className="inline-flex items-center gap-1 rounded-xl bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
            <UserCheck className="h-3.5 w-3.5 animate-pulse" /> Pending Rekan
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-xl bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="h-3.5 w-3.5" /> Rejected
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
            Cancelled
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Draft
          </span>
        );
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  // KPI calculations
  const totalCount = requests.length;
  const pendingStaffCount = requests.filter((r) => r.status === 'Waiting Staff Approval').length;
  const pendingPeerCount = requests.filter((r) => r.status === 'Waiting Employee Approval').length;
  const approvedCount = requests.filter((r) => r.status === 'Approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'Rejected').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#6F4E37] via-[#8B5A2B] to-[#C89B6D] p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-3 py-1 text-xs font-medium tracking-wider backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-200" /> REQUISITION MANAGEMENT
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Request Center</h1>
            <p className="mt-1 text-sm text-amber-100/90 max-w-xl">
              Pusat pengajuan tukar shift, ubah shift, cuti, izin sakit, dan ketidakhadiran dengan alur persetujuan transparan dan otomatis.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
              {hasPermission('request_center.create') && (
              <>
                <button
                  type="button"
                  onClick={() => setIsSwapDrawerOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-900/60 px-4 py-3 text-sm font-semibold text-amber-100 shadow-lg backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-amber-900/80"
                >
                  <ArrowLeftRight className="h-4 w-4" /> Ajukan Tukar Shift
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#6F4E37] shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-50 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" /> Buat Permintaan
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Pengajuan</p>
          <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-100">{totalCount}</p>
        </div>
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-sm backdrop-blur-xl dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Menunggu Persetujuan</p>
          <p className="mt-2 text-2xl font-bold text-amber-800 dark:text-amber-300">
            {pendingStaffCount + pendingPeerCount}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-sm backdrop-blur-xl dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Disetujui (Approved)</p>
          <p className="mt-2 text-2xl font-bold text-emerald-800 dark:text-emerald-300">{approvedCount}</p>
        </div>
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-4 shadow-sm backdrop-blur-xl dark:border-rose-900/40 dark:bg-rose-950/20">
          <p className="text-xs font-medium text-rose-700 dark:text-rose-400">Ditolak / Batal</p>
          <p className="mt-2 text-2xl font-bold text-rose-800 dark:text-rose-300">{rejectedCount}</p>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900/70">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor pengajuan, alasan, atau nama karyawan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-sm outline-none transition focus:border-[#6F4E37] focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter */}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent text-xs font-medium outline-none text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">Semua Jenis</option>
              <option value="SWAP_SHIFT">Tukar Shift</option>
              <option value="CHANGE_SHIFT">Ubah Shift</option>
              <option value="LEAVE">Cuti</option>
              <option value="SICK_LEAVE">Izin Sakit</option>
              <option value="PERMISSION">Izin Absen/Terlambat</option>
              <option value="OVERTIME">Lembur</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs font-medium outline-none text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">Semua Status</option>
              <option value="Waiting Staff Approval">Pending Staff</option>
              <option value="Waiting Employee Approval">Pending Rekan</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Draft">Draft</option>
            </select>
          </div>

          {/* Outlet / Cabang Filter */}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900">
            <Store className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="bg-transparent text-xs font-medium outline-none text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">Semua Cabang</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name || o.code}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={fetchRequests}
            disabled={refreshing}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            title="Refresh data"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Requests Data Table / Cards */}
      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-3xl border border-slate-200/80 bg-white/50 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin text-[#6F4E37]" /> Memuat daftar permintaan...
          </div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/40 py-16 text-center dark:border-slate-800 dark:bg-slate-900/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-[#6F4E37] dark:bg-slate-800 dark:text-amber-300">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-800 dark:text-slate-100">
            Belum ada permintaan
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Tidak ada pengajuan yang sesuai dengan kriteria filter saat ini.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4">Nomor & Tanggal</th>
                  <th className="px-6 py-4">Pemohon</th>
                  <th className="px-6 py-4">Tipe Pengajuan</th>
                  <th className="px-6 py-4">Detail Shift / Target</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                {filteredRequests.map((item) => {
                  const reqEmpName = `${item.employee?.firstName || ''} ${item.employee?.lastName || ''}`.trim();
                  const targetEmpName = item.targetEmployee
                    ? `${item.targetEmployee.firstName} ${item.targetEmployee.lastName || ''}`.trim()
                    : '-';

                  return (
                    <tr
                      key={item.id}
                      className="group transition hover:bg-amber-50/30 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-[#6F4E37] dark:text-amber-300">
                          {item.requestNumber}
                        </span>
                        <div className="text-xs text-slate-500">
                          {new Date(item.startDate).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {item.employee?.firstName?.[0]?.toUpperCase() || 'E'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-slate-800 dark:text-slate-100">{reqEmpName}</p>
                              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-900 dark:bg-amber-500/30 dark:text-amber-200">
                                {(item.employee as any)?.outlet?.code || 'SELON-1'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {item.employee?.shift?.name ? `Shift: ${item.employee.shift.name}` : 'Tanpa Shift'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">{getTypeBadge(item.type, item.permissionType)}</td>

                      <td className="px-6 py-4 text-xs">
                        {item.type === 'SWAP_SHIFT' && (
                          <div>
                            <span className="text-slate-500">Tukar dengan: </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {targetEmpName}
                            </span>
                          </div>
                        )}

                        {item.type === 'CHANGE_SHIFT' && (
                          <div>
                            <span className="text-slate-500">Shift Baru: </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {item.targetShift?.name || '-'} ({item.targetShift?.startTime} - {item.targetShift?.endTime})
                            </span>
                          </div>
                        )}

                        {(item.type === 'LEAVE' || item.type === 'SICK_LEAVE') && (
                          <div>
                            <span className="text-slate-500">Sampai: </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {item.endDate
                                ? new Date(item.endDate).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                  })
                                : '-'}
                            </span>
                          </div>
                        )}

                        {item.type === 'PERMISSION' && (
                          <div className="truncate max-w-[200px] text-slate-600 dark:text-slate-300">
                            "{item.reason}"
                          </div>
                        )}

                        {item.type === 'OVERTIME' && (
                          <div>
                            <span className="text-slate-500">Durasi: </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {item.endDate
                                ? `${((new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / 3600000).toFixed(1)} Jam`
                                : '-'}
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono">
                              ({new Date(item.startDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })} - {item.endDate ? new Date(item.endDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''} WIB)
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">{getStatusBadge(item.status)}</td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openDetail(item)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#6F4E37] hover:text-[#6F4E37] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-amber-400"
                        >
                          <Eye className="h-3.5 w-3.5" /> Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE REQUEST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Buat Permintaan Baru</h3>
                <p className="text-xs text-slate-500">Pilih jenis pengajuan dan isi detail yang diperlukan.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Request Type Tabs */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFormType('SWAP_SHIFT')}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition',
                  formType === 'SWAP_SHIFT'
                    ? 'bg-[#6F4E37] text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                )}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" /> Tukar Shift
              </button>

              <button
                type="button"
                onClick={() => setFormType('CHANGE_SHIFT')}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition',
                  formType === 'CHANGE_SHIFT'
                    ? 'bg-[#6F4E37] text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                )}
              >
                <CalendarCheck className="h-3.5 w-3.5" /> Ubah Shift
              </button>

              <button
                type="button"
                onClick={() => setFormType('LEAVE')}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition',
                  formType === 'LEAVE'
                    ? 'bg-[#6F4E37] text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                )}
              >
                <Calendar className="h-3.5 w-3.5" /> Cuti
              </button>

              <button
                type="button"
                onClick={() => setFormType('SICK_LEAVE')}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition',
                  formType === 'SICK_LEAVE'
                    ? 'bg-[#6F4E37] text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                )}
              >
                <Stethoscope className="h-3.5 w-3.5" /> Sakit
              </button>

              <button
                type="button"
                onClick={() => setFormType('PERMISSION')}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition',
                  formType === 'PERMISSION'
                    ? 'bg-[#6F4E37] text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                )}
              >
                <FileText className="h-3.5 w-3.5" /> Izin
              </button>

              <button
                type="button"
                onClick={() => setFormType('OVERTIME')}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition',
                  formType === 'OVERTIME'
                    ? 'bg-[#6F4E37] text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                )}
              >
                <Clock className="h-3.5 w-3.5" /> Lembur
              </button>
            </div>

            {/* Form Fields */}
            <div className="mt-4 space-y-4 text-sm">
              {/* Permission Category */}
              {formType === 'PERMISSION' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori Izin
                  </label>
                  <select
                    value={formPermissionType}
                    onChange={(e: any) => setFormPermissionType(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="LATE_ARRIVAL">Datang Terlambat</option>
                    <option value="EARLY_LEAVE">Pulang Lebih Awal</option>
                    <option value="ABSENT">Tidak Masuk Kerja</option>
                  </select>
                </div>
              )}

              {/* Date Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {formType === 'LEAVE' || formType === 'SICK_LEAVE' ? 'Tanggal Mulai' : formType === 'OVERTIME' ? 'Tanggal Lembur' : 'Tanggal Shift / Izin'}
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    min={(formType === 'SICK_LEAVE') ? (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0,10); })() : new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                {(formType === 'LEAVE' || formType === 'SICK_LEAVE') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tanggal Selesai
                    </label>
                    <input
                      type="date"
                      value={formEndDate}
                      min={formStartDate || new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                )}
              </div>

              {formType === 'OVERTIME' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Jam Mulai Lembur
                    </label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Jam Selesai Lembur
                    </label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              {/* ── Preview Shift Otomatis ─────────────────────── */}
              {(formType === 'SWAP_SHIFT' || formType === 'CHANGE_SHIFT') && formStartDate && (
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3 dark:border-amber-800/40 dark:bg-amber-950/20">
                  <p className="mb-2 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <CalendarCheck className="h-3.5 w-3.5" />
                    Preview Jadwal Shift — {new Date(formStartDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {loadingPreview ? (
                    <p className="text-xs text-slate-500 animate-pulse">Memuat preview jadwal...</p>
                  ) : shiftPreview ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white/80 px-3 py-2 shadow-sm dark:bg-slate-900/60">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Shift Saya</p>
                        {shiftPreview.myShift ? (
                          <>
                            <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">{shiftPreview.myShift.name}</p>
                            <p className="text-xs text-slate-500">{shiftPreview.myShift.startTime} – {shiftPreview.myShift.endTime}</p>
                            {shiftPreview.myShift.source === 'schedule' && (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">★ Jadwal Khusus</span>
                            )}
                          </>
                        ) : (
                          <p className="mt-0.5 text-xs text-slate-400 italic">Tidak ada shift</p>
                        )}
                      </div>
                      {formType === 'SWAP_SHIFT' && formTargetEmployeeId && (
                        <div className="rounded-xl bg-white/80 px-3 py-2 shadow-sm dark:bg-slate-900/60">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Shift Rekan</p>
                          {shiftPreview.targetShift ? (
                            <>
                              <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">{shiftPreview.targetShift.name}</p>
                              <p className="text-xs text-slate-500">{shiftPreview.targetShift.startTime} – {shiftPreview.targetShift.endTime}</p>
                              {shiftPreview.targetShift.source === 'schedule' && (
                                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">★ Jadwal Khusus</span>
                              )}
                            </>
                          ) : (
                            <p className="mt-0.5 text-xs text-slate-400 italic">Pilih rekan untuk melihat shift</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Pilih tanggal untuk melihat preview shift.</p>
                  )}
                </div>
              )}



              {/* Swap Peer Selection */}
              {formType === 'SWAP_SHIFT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pilih Rekan Kerja
                  </label>
                  <select
                    value={formTargetEmployeeId}
                    onChange={(e) => setFormTargetEmployeeId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="">-- Pilih Rekan Kerja --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName || ''} ({emp.shift?.name || 'Tanpa Shift'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Shift Selection for Change Shift */}
              {formType === 'CHANGE_SHIFT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Shift Tujuan Baru
                  </label>
                  <select
                    value={formTargetShiftId}
                    onChange={(e) => setFormTargetShiftId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="">-- Pilih Shift Tujuan --</option>
                    {shifts.map((shift) => (
                      <option key={shift.id} value={shift.id}>
                        {shift.name} ({shift.startTime} - {shift.endTime})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Doctor note / attachment upload */}
              {(formType === 'SICK_LEAVE' || formType === 'PERMISSION') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lampiran / Surat Dokter (Opsional)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                      <Upload className="h-4 w-4 text-slate-400" />
                      <span>{uploadingFile ? 'Mengunggah...' : 'Pilih Berkas Lampiran'}</span>
                      <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf" />
                    </label>
                    {formAttachmentUrl && (
                      <a
                        href={formAttachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-blue-600 underline"
                      >
                        Lihat Berkas
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alasan Permintaan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="Tuliskan alasan pengajuan Anda dengan jelas..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleCreateRequest(true)}
                disabled={submittingForm}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
              >
                Simpan Draft
              </button>
              <button
                type="button"
                onClick={() => handleCreateRequest(false)}
                disabled={submittingForm}
                className="rounded-2xl bg-[#6F4E37] px-5 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-[#5a3e2b]"
              >
                {submittingForm ? 'Kirim...' : 'Kirim Pengajuan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL & TIMELINE APPROVAL MODAL */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#6F4E37] dark:text-amber-300">
                    {selectedRequest.requestNumber}
                  </span>
                  {getTypeBadge(selectedRequest.type, selectedRequest.permissionType)}
                </div>
                <h3 className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">
                  Pengajuan dari {selectedRequest.employee?.firstName} {selectedRequest.employee?.lastName || ''}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Request Summary Card */}
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 border border-slate-100 dark:bg-slate-950 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status Permintaan:</span>
                <div>{getStatusBadge(selectedRequest.status)}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Tanggal Efektif:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {new Date(selectedRequest.startDate).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  {selectedRequest.endDate && selectedRequest.endDate !== selectedRequest.startDate ? (
                    ` s/d ${new Date(selectedRequest.endDate).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}`
                  ) : ''}
                </span>
              </div>

              {selectedRequest.type === 'SWAP_SHIFT' && selectedRequest.targetEmployee && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Rekan Tukar Shift:</span>
                  <span className="font-semibold text-[#6F4E37] dark:text-amber-300">
                    {selectedRequest.targetEmployee.firstName} {selectedRequest.targetEmployee.lastName || ''}
                  </span>
                </div>
              )}

              {selectedRequest.type === 'CHANGE_SHIFT' && selectedRequest.targetShift && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Shift Baru Yang Diminta:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {selectedRequest.targetShift.name} ({selectedRequest.targetShift.startTime} - {selectedRequest.targetShift.endTime})
                  </span>
                </div>
              )}

              {selectedRequest.type === 'OVERTIME' && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Jam Lembur:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {new Date(selectedRequest.startDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })} - {selectedRequest.endDate ? new Date(selectedRequest.endDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''} WIB 
                    {selectedRequest.endDate && (
                      ` (${((new Date(selectedRequest.endDate).getTime() - new Date(selectedRequest.startDate).getTime()) / 3600000).toFixed(1)} Jam)`
                    )}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500">Alasan:</span>
                <p className="mt-1 font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  "{selectedRequest.reason}"
                </p>
              </div>

              {selectedRequest.attachmentUrl && (
                <div className="pt-1">
                  <a
                    href={selectedRequest.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:underline"
                  >
                    <FileCheck className="h-4 w-4" /> Lihat Berkas Lampiran / Dokter
                  </a>
                </div>
              )}
            </div>

            {/* Tabs for Timeline vs Audit Log */}
            <div className="mt-6 flex border-b border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={cn(
                  'flex items-center gap-1.5 pb-2.5 px-4 font-semibold border-b-2 transition',
                  activeTab === 'timeline'
                    ? 'border-[#6F4E37] text-[#6F4E37] dark:border-amber-400 dark:text-amber-300'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <Clock className="h-3.5 w-3.5" /> Timeline Approval
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={cn(
                  'flex items-center gap-1.5 pb-2.5 px-4 font-semibold border-b-2 transition',
                  activeTab === 'audit'
                    ? 'border-[#6F4E37] text-[#6F4E37] dark:border-amber-400 dark:text-amber-300'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <History className="h-3.5 w-3.5" /> Audit Log (Aktivitas)
              </button>
            </div>

            {/* Tab Body */}
            <div className="mt-4 max-h-72 overflow-y-auto pr-1">
              {activeTab === 'timeline' ? (
                <TimelineApproval
                  timelines={selectedRequest.timelines}
                  currentStatus={selectedRequest.status}
                />
              ) : (
                <div className="space-y-2 text-xs">
                  {selectedRequest.auditLogs && selectedRequest.auditLogs.length > 0 ? (
                    selectedRequest.auditLogs.map((log: any) => (
                      <div
                        key={log.id}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
                      >
                        <div className="flex justify-between font-medium text-slate-700 dark:text-slate-200">
                          <span>{log.action}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(log.createdAt).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-500">{log.details}</p>
                        <p className="mt-1 text-[11px] text-slate-400">Oleh: {log.user?.username || 'System'}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 italic py-4 text-center">Belum ada riwayat log aktivitas.</p>
                  )}
                </div>
              )}
            </div>

            {/* Action Box for Peer or Staff Approval */}
            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
              {/* If Peer Approval Pending for Current User */}
              {selectedRequest.status === 'Waiting Employee Approval' &&
                selectedRequest.targetEmployee?.user?.username === user?.username && (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                    <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 mb-2">
                      Konfirmasi Permintaan Tukar Shift Dari Rekan Kerja:
                    </p>
                    <textarea
                      rows={2}
                      placeholder="Tambahkan catatan respon (opsional)..."
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <div className="mt-3 flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => handlePeerRespond('REJECT')}
                        disabled={submittingAction}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Tolak Tukar
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePeerRespond('ACCEPT')}
                        disabled={submittingAction}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700"
                      >
                        Setujui Tukar Shift
                      </button>
                    </div>
                  </div>
                )}

              {/* If Staff / Admin Approval Pending */}
              {selectedRequest.status === 'Waiting Staff Approval' && canApproveRequest && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">
                    Tindakan Administrator / Staff:
                  </p>
                  <textarea
                    rows={2}
                    placeholder="Tuliskan catatan persetujuan atau alasan penolakan..."
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 mb-2"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={submittingAction}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Tolak
                    </button>
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={submittingAction}
                      className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700"
                    >
                      Setujui & Perbarui Jadwal
                    </button>
                  </div>
                </div>
              )}

              {/* Cancel Action for Pemohon */}
              {['Submitted', 'Waiting Employee Approval', 'Waiting Staff Approval', 'Draft'].includes(
                selectedRequest.status
              ) &&
                (selectedRequest.employee?.user?.username === user?.username || canApproveRequest) && (
                  <div className="mt-3 flex justify-start">
                    <button
                      type="button"
                      onClick={() => handleCancel(selectedRequest.id)}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Batalkan Permintaan Ini
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      <SwapShiftDrawer
        isOpen={isSwapDrawerOpen}
        onClose={() => setIsSwapDrawerOpen(false)}
        onSuccess={fetchRequests}
        currentEmployee={user?.employee}
      />
    </div>
  );
}
