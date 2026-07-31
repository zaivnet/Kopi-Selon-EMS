import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Alert, Avatar, Badge, Button, Input } from '@/components/ui/design-system';

type DialogName = 'profile' | 'password' | null;
type ProfileData = {
  id: string;
  username: string;
  role: { name: string } | string;
  employee?: {
    firstName: string;
    lastName: string;
    phone?: string | null;
  } | null;
};

const errorMessage = (error: any) => error?.response?.data?.message || 'Terjadi kendala. Silakan coba lagi.';

function DialogShell({ title, description, onClose, busy, initialFocusRef, children }: {
  title: string;
  description: string;
  onClose: () => void;
  busy: boolean;
  initialFocusRef?: React.RefObject<HTMLInputElement | null>;
  children: React.ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const busyRef = useRef(busy);
  const onCloseRef = useRef(onClose);
  busyRef.current = busy;
  onCloseRef.current = onClose;
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => (initialFocusRef?.current || closeRef.current)?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!busyRef.current) onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex min-h-0 items-end justify-center overflow-hidden bg-slate-950/55 px-0 pt-3 backdrop-blur-[2px] sm:items-center sm:p-5"
      style={{
        height: '100dvh',
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-dialog-title"
        aria-describedby="account-dialog-description"
        aria-busy={busy}
        className="flex max-h-[calc(100dvh-0.75rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full min-h-0 flex-col overflow-hidden rounded-t-[28px] border border-amber-200/70 bg-[#fffaf3] shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-lg sm:rounded-[28px] dark:border-[#4b3628] dark:bg-[#18110d]"
      >
        <header className="z-10 flex shrink-0 items-start justify-between border-b border-amber-200/60 bg-[#fffaf3]/95 px-5 py-3.5 backdrop-blur sm:px-6 sm:py-4 dark:border-[#3e2e24] dark:bg-[#18110d]/95">
          <div>
            <h2 id="account-dialog-title" className="text-lg font-bold text-[#3f2a1d] dark:text-amber-100">{title}</h2>
            <p id="account-dialog-description" className="mt-0.5 text-xs text-slate-500 dark:text-amber-200/60">{description}</p>
          </div>
          <button ref={closeRef} type="button" disabled={busy} onClick={onClose} aria-label="Tutup dialog" className="ml-4 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-amber-100 hover:text-[#6f4e37] focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-amber-200/60 dark:hover:bg-amber-950/40"><X className="h-4 w-4" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">{children}</div>
      </section>
    </div>,
    document.body
  );
}

export function AccountDialogs({ active, onClose }: { active: DialogName; onClose: () => void }) {
  const { user, updateCurrentUser, hasPermission } = useAuth();
  const canEditUsername = hasPermission('user_management.edit_user');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileForm, setProfileForm] = useState({ username: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmation: '' });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const fetchProfile = useCallback(() => {
    setLoadError('');
    setLoading(true);
    api.get('/auth/profile')
      .then(({ data }) => {
        setProfile(data);
        setProfileForm({ username: data.username });
      })
      .catch((requestError) => {
        setProfile(null);
        setLoadError(errorMessage(requestError));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!active) return;
    setError('');
    setSuccess('');
    setSaving(false);
    setVisible({ current: false, next: false, confirm: false });
    setPasswordForm({ currentPassword: '', newPassword: '', confirmation: '' });
    setProfile(null);
    setLoadError('');
    if (active === 'profile') fetchProfile();
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [active, fetchProfile]);

  if (!active) return null;
  const roleName = typeof profile?.role === 'string' ? profile.role : profile?.role.name || user?.role || '';
  const employeeName = profile?.employee ? `${profile.employee.firstName} ${profile.employee.lastName || ''}`.trim() : '';

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEditUsername) return;
    setError('');
    setSuccess('');
    if (!profileForm.username.trim()) {
      setError('Username wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', profileForm);
      setProfile(data);
      updateCurrentUser({ id: data.id, username: data.username, role: typeof data.role === 'string' ? data.role : data.role.name });
      setSuccess('Profil berhasil diperbarui.');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!passwordForm.currentPassword) return setError('Password saat ini wajib diisi.');
    if (passwordForm.newPassword.length < 8) return setError('Password baru minimal 8 karakter.');
    if (passwordForm.currentPassword === passwordForm.newPassword) return setError('Password baru harus berbeda dari password saat ini.');
    if (passwordForm.newPassword !== passwordForm.confirmation) return setError('Konfirmasi password baru tidak cocok.');
    setSaving(true);
    try {
      const { data } = await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setSuccess(data.message);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmation: '' });
      closeTimerRef.current = window.setTimeout(onClose, 1100);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const feedback = error ? <div id="account-form-error" role="alert" aria-live="assertive"><Alert variant="danger" title={error} icon={<AlertCircle className="h-4 w-4" />} /></div> : success ? <div role="status" aria-live="polite"><Alert variant="success" title={success} icon={<CheckCircle2 className="h-4 w-4" />} /></div> : null;

  if (active === 'profile') {
    return (
      <DialogShell title="Profil Saya" description="Kelola identitas akun yang sedang digunakan." onClose={onClose} busy={saving} initialFocusRef={initialFocusRef}>
        {loading ? <div role="status" aria-live="polite" className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500 dark:text-amber-200/70"><Loader2 className="h-5 w-5 animate-spin text-amber-600" /> Memuat profil...</div> : loadError ? (
          <div className="flex min-h-56 flex-col items-center justify-center text-center" role="alert">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300"><AlertCircle className="h-5 w-5" /></div>
            <p className="mt-3 text-sm font-bold text-slate-800 dark:text-amber-100">Profil belum berhasil dimuat</p>
            <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-amber-200/60">{loadError}</p>
            <Button type="button" variant="outline" className="mt-4" onClick={fetchProfile}>Coba lagi</Button>
          </div>
        ) : profile ? (
          <form onSubmit={saveProfile} className="space-y-4 sm:space-y-5">
            <div className="relative overflow-hidden rounded-[22px] border border-amber-200 bg-gradient-to-br from-[#f7e6cf] to-[#fffaf3] p-4 dark:border-[#4b3628] dark:from-[#322217] dark:to-[#21160f]">
              <div className="absolute -right-8 -top-9 h-24 w-24 rounded-full border-[14px] border-amber-500/10" />
              <div className="relative flex items-center gap-3.5">
                <Avatar name={employeeName || profileForm.username || 'User'} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-bold text-[#3f2a1d] dark:text-amber-100">{employeeName || profileForm.username}</p>
                  <Badge className="mt-2">{roleName}</Badge>
                </div>
              </div>
            </div>
            {feedback}
            <div>
              <label className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-amber-100">
                Username
                <Input
                  ref={initialFocusRef}
                  value={profileForm.username}
                  onChange={(e) => setProfileForm((value) => ({ ...value, username: e.target.value }))}
                  disabled={!canEditUsername}
                  className={!canEditUsername ? "cursor-not-allowed opacity-70 bg-amber-500/5" : ""}
                  autoComplete="username"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'account-form-error' : undefined}
                />
              </label>
              {!canEditUsername && (
                <p className="mt-1.5 text-[11px] font-medium text-slate-500 dark:text-amber-300/70">
                  🔒 Username hanya dapat diubah oleh Administrator.
                </p>
              )}
            </div>
            <label className="block space-y-1.5 text-xs font-semibold text-slate-700 dark:text-amber-100">Role<Input value={roleName} disabled className="cursor-not-allowed opacity-70" /></label>
            {profile?.employee ? <div className="rounded-2xl border border-amber-200/70 bg-white/60 p-4 text-xs dark:border-[#3e2e24] dark:bg-[#21160f]"><p className="mb-3 font-bold text-[#5b3b27] dark:text-amber-200">Informasi karyawan</p><dl className="grid gap-3 sm:grid-cols-2">{[['Nama', employeeName], ['Telepon', profile.employee.phone || '-']].map(([label, value]) => <div key={label}><dt className="text-slate-400 dark:text-amber-200/45">{label}</dt><dd className="mt-0.5 font-semibold text-slate-700 dark:text-amber-100">{value}</dd></div>)}</dl></div> : null}
            <div className="sticky bottom-0 z-[5] -mx-4 flex flex-col-reverse gap-2 border-t border-amber-200/60 bg-[#fffaf3]/95 px-4 pb-0 pt-3 backdrop-blur min-[400px]:flex-row min-[400px]:justify-end sm:-mx-6 sm:px-6 dark:border-[#3e2e24] dark:bg-[#18110d]/95">
              <Button type="button" variant="ghost" className="w-full min-[400px]:w-auto" disabled={saving} onClick={onClose}>Batal</Button>
              <Button type="submit" className="w-full min-[400px]:w-auto" disabled={saving || !canEditUsername}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan profil
              </Button>
            </div>
          </form>
        ) : null}
      </DialogShell>
    );
  }

  const passwordInput = (label: string, field: keyof typeof passwordForm, visibility: keyof typeof visible, autoComplete: string, autoFocus = false) => (
    <label className="block space-y-1.5 text-xs font-semibold text-slate-700 dark:text-amber-100">{label}<span className="relative block"><Input ref={autoFocus ? initialFocusRef : undefined} type={visible[visibility] ? 'text' : 'password'} value={passwordForm[field]} onChange={(e) => setPasswordForm((value) => ({ ...value, [field]: e.target.value }))} autoComplete={autoComplete} className="pr-12" aria-invalid={!!error} aria-describedby={error ? 'account-form-error' : undefined} /><button type="button" disabled={saving} onClick={() => setVisible((value) => ({ ...value, [visibility]: !value[visibility] }))} className="absolute right-0.5 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-amber-100 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-40 dark:hover:bg-amber-950/40" aria-label={`${visible[visibility] ? 'Sembunyikan' : 'Tampilkan'} ${label.toLowerCase()}`}>{visible[visibility] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
  );

  return (
    <DialogShell title="Ganti Password" description="Perbarui kunci akses tanpa keluar dari akun." onClose={onClose} busy={saving} initialFocusRef={initialFocusRef}>
      <form onSubmit={savePassword} className="space-y-3.5 sm:space-y-4">
        <div className="flex items-center gap-3 rounded-[20px] border border-amber-200 bg-amber-50/70 p-4 dark:border-[#4b3628] dark:bg-[#2b1d14]"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-600 text-white"><ShieldCheck className="h-5 w-5" /></div><div><p className="text-sm font-bold text-[#493020] dark:text-amber-100">{user?.username}</p><p className="text-xs text-slate-500 dark:text-amber-200/60">Password minimal 8 karakter</p></div></div>
        {feedback}
        {passwordInput('Password saat ini', 'currentPassword', 'current', 'current-password', true)}
        {passwordInput('Password baru', 'newPassword', 'next', 'new-password')}
        {passwordInput('Konfirmasi password baru', 'confirmation', 'confirm', 'new-password')}
        <div className="sticky bottom-0 z-[5] -mx-4 flex flex-col-reverse gap-2 border-t border-amber-200/60 bg-[#fffaf3]/95 px-4 pb-0 pt-3 backdrop-blur min-[400px]:flex-row min-[400px]:justify-end sm:-mx-6 sm:px-6 dark:border-[#3e2e24] dark:bg-[#18110d]/95"><Button type="button" variant="ghost" className="w-full min-[400px]:w-auto" disabled={saving} onClick={onClose}>Batal</Button><Button type="submit" className="w-full min-[400px]:w-auto" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Ganti password</Button></div>
      </form>
    </DialogShell>
  );
}
