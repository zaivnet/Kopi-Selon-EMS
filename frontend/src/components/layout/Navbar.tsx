import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from 'next-themes';
import { Bell, ChevronDown, Key, LogOut, Menu, Moon, PanelLeft, Search, Sun, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AccountDialogs } from '@/components/account/AccountDialogs';

export default function Navbar({
  collapsed,
  onMenuClick,
  onSidebarToggle
}: {
  collapsed: boolean;
  mobileOpen?: boolean;
  onMenuClick: () => void;
  onSidebarToggle: () => void;
}) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [accountDialog, setAccountDialog] = useState<'profile' | 'password' | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return;
        const res = await axios.get('/api/requests/pending-count', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPendingCount(res.data.totalBadgeCount || 0);
      } catch (e) {
        // ignore
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/70">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 lg:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          aria-label="Buka sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onSidebarToggle}
          className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 lg:inline-flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-5 w-5" />
        </button>

        <label className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-500 shadow-sm transition focus-within:border-[#6F4E37]/40 focus-within:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
          <Search className="h-4 w-4" />
          <input
            type="text"
            placeholder="Cari karyawan, shift, laporan..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </label>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => navigate(user?.role === 'Karyawan' ? '/dashboard/shifts' : '/dashboard/requests')}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            aria-label="Notifications"
            title={pendingCount > 0 ? `${pendingCount} pengajuan memerlukan tindakan` : 'Request Center Notifikasi'}
          >
            <Bell className="h-4 w-4" />
            {pendingCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-950 animate-pulse">
                {pendingCount}
              </span>
            ) : (
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 dark:hidden" />
            <Moon className="h-4 w-4 hidden dark:block" />
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((value) => !value)}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-2 py-1.5 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6F4E37] to-[#C89B6D] text-sm font-semibold text-white">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">{user?.username || 'User'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user?.role || 'Member'}</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block dark:text-slate-400" />
            </button>

            {dropdownOpen ? (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/70">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.email || 'user@example.com'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user?.role || 'Member'}</p>
                </div>
                <button type="button" onClick={() => { setDropdownOpen(false); setAccountDialog('profile'); }} className="mt-2 flex w-full items-center rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </button>
                <button type="button" onClick={() => { setDropdownOpen(false); setAccountDialog('password'); }} className="flex w-full items-center rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                  <Key className="mr-2 h-4 w-4" />
                  Change Password
                </button>
                <button
                  onClick={logout}
                  className="flex w-full items-center rounded-xl px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <AccountDialogs active={accountDialog} onClose={() => setAccountDialog(null)} />
    </header>
  );
}
