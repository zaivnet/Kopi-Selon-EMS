import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  ArrowLeftRight,
  CalendarCheck,
  Calendar as CalendarIcon,
  FileText,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type RequestDrawerType = 'SWAP_SHIFT' | 'CHANGE_SHIFT' | 'LEAVE' | 'SICK_LEAVE' | 'PERMISSION' | 'OVERTIME';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface PeerEmployee {
  id: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  shift?: Shift;
}

interface EmployeeRequestDrawerProps {
  isOpen: boolean;
  initialType?: RequestDrawerType;
  onClose: () => void;
  onSuccess: () => void;
  currentEmployee?: any;
}

export default function EmployeeRequestDrawer({
  isOpen,
  initialType = 'SWAP_SHIFT',
  onClose,
  onSuccess,
  currentEmployee,
}: EmployeeRequestDrawerProps) {
  const [requestType, setRequestType] = useState<RequestDrawerType>(initialType);
  const [permissionCategory, setPermissionCategory] = useState<'LATE_ARRIVAL' | 'EARLY_LEAVE' | 'ABSENT' | 'SICK'>('LATE_ARRIVAL');

  // Dates
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Overtime times
  const [overtimeStartTime, setOvertimeStartTime] = useState<string>('17:00');
  const [overtimeEndTime, setOvertimeEndTime] = useState<string>('20:00');

  // Shifts & Peers
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [targetShiftId, setTargetShiftId] = useState<string>('');
  const [eligiblePeers, setEligiblePeers] = useState<PeerEmployee[]>([]);
  const [searchPeer, setSearchPeer] = useState<string>('');
  const [selectedPeer, setSelectedPeer] = useState<PeerEmployee | null>(null);

  // Reason & Attachments
  const [reason, setReason] = useState<string>('');
  const [additionalNote, setAdditionalNote] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');

  // States
  const [loadingPeers, setLoadingPeers] = useState<boolean>(false);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial type when drawer opens
  useEffect(() => {
    if (isOpen) {
      setRequestType(initialType);
      setErrorMessage(null);
      setToastMessage(null);
      setReason('');
      setAdditionalNote('');
      setAttachmentUrl('');
      setSelectedPeer(null);
      setTargetShiftId('');
      setOvertimeStartTime('17:00');
      setOvertimeEndTime('20:00');
    }
  }, [isOpen, initialType]);

  // Fetch shifts list for Change Shift
  useEffect(() => {
    if (!isOpen) return;
    const fetchShifts = async () => {
      try {
        const res = await api.get('/shifts');
        setShifts(res.data || []);
      } catch (err) {
        console.error('Error fetching shifts:', err);
      }
    };
    fetchShifts();
  }, [isOpen]);

  // Fetch eligible peers when date changes for Swap Shift
  useEffect(() => {
    if (!isOpen || requestType !== 'SWAP_SHIFT') return;

    const fetchEligiblePeers = async () => {
      try {
        setLoadingPeers(true);
        setSelectedPeer(null);
        setErrorMessage(null);

        const res = await api.get('/requests/eligible-swap-peers', {
          params: { date: selectedDate },
        });

        setEligiblePeers(res.data || []);
      } catch (err) {
        console.error('Error fetching eligible peers:', err);
        setEligiblePeers([]);
      } finally {
        setLoadingPeers(false);
      }
    };

    fetchEligiblePeers();
  }, [isOpen, selectedDate, requestType]);

  if (!isOpen) return null;

  const currentShift: Shift | null = currentEmployee?.shift || null;

  const filteredPeers = eligiblePeers.filter((p) => {
    const fullName = `${p.firstName} ${p.lastName || ''}`.toLowerCase();
    return fullName.includes(searchPeer.toLowerCase());
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingFile(true);
      const res = await api.post('/requests/upload-attachment', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setAttachmentUrl(res.data.url);
    } catch (err) {
      alert('Gagal mengunggah berkas lampiran.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (requestType === 'SWAP_SHIFT' && !selectedPeer) {
      setErrorMessage('Pilih rekan kerja yang akan diajak tukar shift.');
      return;
    }

    if (requestType === 'CHANGE_SHIFT' && !targetShiftId) {
      setErrorMessage('Pilih shift tujuan baru.');
      return;
    }

    if (!reason || reason.trim().length < 10) {
      setErrorMessage('Alasan pengajuan wajib diisi (minimal 10 karakter).');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const fullReason = additionalNote.trim()
        ? `${reason.trim()}\nCatatan tambahan: ${additionalNote.trim()}`
        : reason.trim();

      const payloadType =
        requestType === 'PERMISSION' && permissionCategory === 'SICK'
          ? 'SICK_LEAVE'
          : requestType;

      const payloadPermissionType =
        requestType === 'PERMISSION' && permissionCategory !== 'SICK'
          ? permissionCategory
          : null;

      let startPayload: string = selectedDate;
      let endPayload: string = selectedDate;

      if (requestType === 'OVERTIME') {
        startPayload = `${selectedDate}T${overtimeStartTime}:00`;
        const endTemp = `${selectedDate}T${overtimeEndTime}:00`;
        if (overtimeEndTime < overtimeStartTime) {
          const endObj = new Date(endTemp);
          endObj.setDate(endObj.getDate() + 1);
          // Format as YYYY-MM-DDTHH:mm:ss because backend will parse it
          const pad = (n: number) => String(n).padStart(2, '0');
          endPayload = `${endObj.getFullYear()}-${pad(endObj.getMonth() + 1)}-${pad(endObj.getDate())}T${overtimeEndTime}:00`;
        } else {
          endPayload = endTemp;
        }
      } else if (requestType === 'LEAVE' || requestType === 'SICK_LEAVE') {
        endPayload = endDate || selectedDate;
      }

      await api.post('/requests', {
        type: payloadType,
        permissionType: payloadPermissionType,
        startDate: startPayload,
        endDate: endPayload,
        targetShiftId: requestType === 'CHANGE_SHIFT' ? targetShiftId : null,
        targetEmployeeId: requestType === 'SWAP_SHIFT' ? selectedPeer?.id : null,
        reason: fullReason,
        attachmentUrl: attachmentUrl || null,
        isDraft: false,
      });

      // Toast Success Message
      setToastMessage('Permintaan berhasil dikirim dan siap diproses oleh manajemen.');

      setTimeout(() => {
        setToastMessage(null);
        onSuccess();
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error('Error submitting request:', err);
      setErrorMessage(err.response?.data?.message || 'Gagal mengirim permintaan.');
    } finally {
      setSubmitting(false);
    }
  };

  const getDrawerHeaderTitle = () => {
    switch (requestType) {
      case 'SWAP_SHIFT':
        return 'Ajukan Tukar Shift';
      case 'CHANGE_SHIFT':
        return 'Ajukan Ganti Shift';
      case 'LEAVE':
        return 'Ajukan Cuti';
      case 'SICK_LEAVE':
      case 'PERMISSION':
        return 'Ajukan Izin / Sakit';
      case 'OVERTIME':
        return 'Ajukan Lembur';
      default:
        return 'Buat Permintaan';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-2xl animate-bounce">
          <CheckCircle2 className="h-5 w-5 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-white p-6 shadow-2xl dark:bg-slate-900 overflow-y-auto flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6F4E37] text-white">
                    {requestType === 'SWAP_SHIFT' && <ArrowLeftRight className="h-4 w-4" />}
                    {requestType === 'CHANGE_SHIFT' && <CalendarCheck className="h-4 w-4" />}
                    {requestType === 'LEAVE' && <CalendarIcon className="h-4 w-4" />}
                    {(requestType === 'PERMISSION' || requestType === 'SICK_LEAVE') && <FileText className="h-4 w-4" />}
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{getDrawerHeaderTitle()}</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Formulir resmi pengajuan karyawan KOPI SELON EMS.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Request Type Selector Pills */}
            <div className="mt-4 flex flex-wrap gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setRequestType('SWAP_SHIFT')}
                className={cn(
                  'flex-1 text-center py-1.5 px-2 rounded-xl text-[11px] font-bold transition',
                  requestType === 'SWAP_SHIFT'
                    ? 'bg-[#6F4E37] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                Tukar Shift
              </button>

              <button
                type="button"
                onClick={() => setRequestType('CHANGE_SHIFT')}
                className={cn(
                  'flex-1 text-center py-1.5 px-2 rounded-xl text-[11px] font-bold transition',
                  requestType === 'CHANGE_SHIFT'
                    ? 'bg-[#6F4E37] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                Ganti Shift
              </button>

              <button
                type="button"
                onClick={() => setRequestType('LEAVE')}
                className={cn(
                  'flex-1 text-center py-1.5 px-2 rounded-xl text-[11px] font-bold transition',
                  requestType === 'LEAVE'
                    ? 'bg-[#6F4E37] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                Cuti
              </button>

              <button
                type="button"
                onClick={() => setRequestType('PERMISSION')}
                className={cn(
                  'flex-1 text-center py-1.5 px-2 rounded-xl text-[11px] font-bold transition',
                  requestType === 'PERMISSION' || requestType === 'SICK_LEAVE'
                    ? 'bg-[#6F4E37] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                Izin / Sakit
              </button>

              <button
                type="button"
                onClick={() => setRequestType('OVERTIME')}
                className={cn(
                  'flex-1 text-center py-1.5 px-2 rounded-xl text-[11px] font-bold transition',
                  requestType === 'OVERTIME'
                    ? 'bg-[#6F4E37] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                Lembur
              </button>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mt-4 rounded-2xl bg-rose-50 p-3 border border-rose-200 text-xs font-semibold text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/40 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* SECTION 1: SHIFT SAYA (READONLY) */}
            <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6F4E37] dark:text-amber-400">
                  Informasi Shift Saya (Readonly)
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Terjadwal
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Tanggal Pengajuan:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>

                {requestType === 'LEAVE' && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Tanggal Selesai:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Shift Saat Ini:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {currentShift ? currentShift.name : 'Shift Pagi'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Jam Masuk & Pulang:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                    {currentShift ? `${currentShift.startTime} - ${currentShift.endTime} WIB` : '08:00 - 17:00 WIB'}
                  </span>
                </div>
              </div>
            </div>

            {/* DYNAMIC FORM DEPENDING ON TYPE */}

            {/* SWAP SHIFT SPECIFIC FIELDS */}
            {requestType === 'SWAP_SHIFT' && (
              <>
                <div className="mt-4">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Pilih Rekan Kerja <span className="text-rose-500">*</span>
                  </label>

                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama rekan kerja..."
                      value={searchPeer}
                      onChange={(e) => setSearchPeer(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs outline-none transition focus:border-[#6F4E37] focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-inner dark:border-slate-800 dark:bg-slate-950 space-y-1">
                    {loadingPeers ? (
                      <p className="p-3 text-center text-xs text-slate-400">Memuat rekan kerja...</p>
                    ) : filteredPeers.length === 0 ? (
                      <p className="p-3 text-center text-xs text-slate-400 italic">
                        Tidak ada rekan kerja yang memenuhi syarat pada tanggal ini.
                      </p>
                    ) : (
                      filteredPeers.map((peer) => {
                        const isSelected = selectedPeer?.id === peer.id;
                        return (
                          <button
                            key={peer.id}
                            type="button"
                            onClick={() => setSelectedPeer(peer)}
                            className={cn(
                              'flex w-full items-center justify-between rounded-xl p-2 text-left text-xs transition',
                              isSelected
                                ? 'bg-[#6F4E37] text-white shadow-sm'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {peer.firstName[0]}
                              </div>
                              <span className="font-semibold">
                                {peer.firstName} {peer.lastName || ''}
                              </span>
                            </div>
                            <span className={cn('text-[11px]', isSelected ? 'text-amber-200' : 'text-slate-400')}>
                              {peer.shift ? peer.shift.name : 'Shift Pagi'}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {selectedPeer && (
                  <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900/40 dark:bg-blue-950/20 text-xs">
                    <p className="font-bold text-blue-900 dark:text-blue-300 mb-1 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Rekan Terpilih:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-200">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Nama:</span>
                        <span className="font-bold">{selectedPeer.firstName} {selectedPeer.lastName || ''}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Shift Rekan:</span>
                        <span className="font-bold">{selectedPeer.shift?.name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Jam Masuk:</span>
                        <span className="font-mono">{selectedPeer.shift?.startTime || '-'} WIB</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Jam Pulang:</span>
                        <span className="font-mono">{selectedPeer.shift?.endTime || '-'} WIB</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* CHANGE SHIFT SPECIFIC FIELDS */}
            {requestType === 'CHANGE_SHIFT' && (
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pilih Shift Tujuan Baru <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetShiftId}
                  onChange={(e) => setTargetShiftId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="">-- Pilih Shift Baru --</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} - {s.endTime} WIB)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* PERMISSION & SICK LEAVE FIELDS */}
            {(requestType === 'PERMISSION' || requestType === 'SICK_LEAVE') && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori Izin
                  </label>
                  <select
                    value={permissionCategory}
                    onChange={(e: any) => setPermissionCategory(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="LATE_ARRIVAL">Datang Terlambat</option>
                    <option value="EARLY_LEAVE">Pulang Lebih Awal</option>
                    <option value="SICK">Izin Sakit (Surat Dokter)</option>
                    <option value="ABSENT">Tidak Masuk Kerja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Upload Surat Dokter / Berkas Lampiran (Opsional)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                      <Upload className="h-4 w-4 text-slate-400" />
                      <span>{uploadingFile ? 'Mengunggah...' : 'Pilih Berkas'}</span>
                      <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf" />
                    </label>
                    {attachmentUrl && (
                      <a
                        href={attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-blue-600 underline"
                      >
                        Lihat Berkas
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* OVERTIME FIELDS */}
            {requestType === 'OVERTIME' && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Jam Mulai Lembur <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={overtimeStartTime}
                      onChange={(e) => setOvertimeStartTime(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Jam Selesai Lembur <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={overtimeEndTime}
                      onChange={(e) => setOvertimeEndTime(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* COMMON FIELDS: ALASAN & CATATAN */}
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alasan Pengajuan <span className="text-rose-500">* (Min 10 karakter)</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tuliskan alasan pengajuan Anda secara jelas..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none transition focus:border-[#6F4E37] focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
                <p className={cn('text-[10px] text-right mt-0.5', reason.length >= 10 ? 'text-emerald-600' : 'text-slate-400')}>
                  {reason.length} / 10 karakter
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={additionalNote}
                  onChange={(e) => setAdditionalNote(e.target.value)}
                  placeholder="Catatan tambahan (opsional)..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none transition focus:border-[#6F4E37] focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* BOTTOM ACTIONS */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                submitting ||
                reason.length < 10 ||
                (requestType === 'SWAP_SHIFT' && !selectedPeer) ||
                (requestType === 'CHANGE_SHIFT' && !targetShiftId)
              }
              className={cn(
                'rounded-2xl px-5 py-2.5 text-xs font-bold text-white shadow-lg transition',
                submitting ||
                reason.length < 10 ||
                (requestType === 'SWAP_SHIFT' && !selectedPeer) ||
                (requestType === 'CHANGE_SHIFT' && !targetShiftId)
                  ? 'bg-slate-300 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500'
                  : 'bg-[#6F4E37] hover:bg-[#5a3e2b]'
              )}
            >
              {submitting ? 'Mengirim...' : 'Kirim Permintaan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
