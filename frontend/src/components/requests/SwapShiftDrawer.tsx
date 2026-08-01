import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ArrowLeftRight,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface SwapShiftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentEmployee?: any;
}

export default function SwapShiftDrawer({
  isOpen,
  onClose,
  onSuccess,
  currentEmployee,
}: SwapShiftDrawerProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [eligiblePeers, setEligiblePeers] = useState<PeerEmployee[]>([]);
  const [searchPeer, setSearchPeer] = useState<string>('');
  const [selectedPeer, setSelectedPeer] = useState<PeerEmployee | null>(null);

  const [reason, setReason] = useState<string>('');
  const [additionalNote, setAdditionalNote] = useState<string>('');

  const [loadingPeers, setLoadingPeers] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getAuthToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${getAuthToken()}` } });

  // Fetch eligible peers when date changes or drawer opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchEligiblePeers = async () => {
      try {
        setLoadingPeers(true);
        setSelectedPeer(null);
        setErrorMessage(null);

        const res = await axios.get('/api/requests/eligible-swap-peers', {
          ...getAuthHeaders(),
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
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const currentShift: Shift | null = currentEmployee?.shift || null;

  // Filtered peers list by search term
  const filteredPeers = eligiblePeers.filter((p) => {
    const fullName = `${p.firstName} ${p.lastName || ''}`.toLowerCase();
    return fullName.includes(searchPeer.toLowerCase());
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPeer) {
      setErrorMessage('Pilih rekan kerja yang akan diajak tukar shift.');
      return;
    }

    if (!reason || reason.trim().length < 10) {
      setErrorMessage('Alasan penukaran shift wajib diisi (minimal 10 karakter).');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const fullReason = additionalNote.trim()
        ? `${reason.trim()}\nCatatan tambahan: ${additionalNote.trim()}`
        : reason.trim();

      await axios.post(
        '/api/requests',
        {
          type: 'SWAP_SHIFT',
          startDate: selectedDate,
          endDate: selectedDate,
          targetEmployeeId: selectedPeer.id,
          reason: fullReason,
          isDraft: false,
        },
        getAuthHeaders()
      );

      // Toast Success
      setToastMessage('Permintaan tukar shift berhasil dikirim.');

      setTimeout(() => {
        setToastMessage(null);
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error submitting swap shift request:', err);
      setErrorMessage(err.response?.data?.message || 'Gagal mengirim permintaan tukar shift.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-2xl animate-bounce">
          <CheckCircle2 className="h-5 w-5 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="relative w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl dark:bg-slate-900 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#6F4E37] to-[#C89B6D] text-white">
                <ArrowLeftRight className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Ajukan Tukar Shift</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Ajukan pertukaran jadwal kerja dengan rekan kerja.
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

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin">
          {/* Error Banner */}
          {errorMessage && (
            <div className="rounded-2xl bg-rose-50 p-3 border border-rose-200 text-xs font-semibold text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/40 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SECTION 1: SHIFT SAYA (READONLY) */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950">
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
                <span className="text-slate-500">Tanggal Target:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Shift Saya:</span>
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

          {/* SECTION 2: PILIH REKAN KERJA (SEARCHABLE SELECT) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Pilih Rekan Kerja <span className="text-rose-500">*</span>
            </label>

            {/* Search Field */}
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

            {/* Dropdown Options */}
            <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-inner dark:border-slate-800 dark:bg-slate-950 space-y-1">
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

          {/* SECTION 3: RINGKASAN REKAN TERPILIH */}
          {selectedPeer && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20 text-xs">
              <p className="font-bold text-blue-900 dark:text-blue-300 mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Rekan Kerja Terpilih:
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

          {/* SECTION 4: FORM ALASAN & CATATAN TAMBAHAN */}
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alasan Penukaran <span className="text-rose-500">* (Min 10 karakter)</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tuliskan alasan penukaran shift..."
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
                placeholder="Catatan pendukung (opsional)..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none transition focus:border-[#6F4E37] focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* BOTTOM ACTIONS */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 shrink-0">
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
            disabled={submitting || !selectedPeer || reason.length < 10}
            className={cn(
              'rounded-2xl px-5 py-2.5 text-xs font-bold text-white shadow-lg transition',
              submitting || !selectedPeer || reason.length < 10
                ? 'bg-slate-300 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500'
                : 'bg-[#6F4E37] hover:bg-[#5a3e2b]'
            )}
          >
            {submitting ? 'Mengirim...' : 'Kirim Permintaan'}
          </button>
        </div>
      </div>
    </div>
  );
}
