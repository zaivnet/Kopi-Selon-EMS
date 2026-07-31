import { useState } from 'react';
import { Coffee, Lock, Sparkles, UserRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'react-router-dom';
import api from '@/lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const isExpired = searchParams.get('expired') === 'true';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', {
        username,
        password,
        rememberMe
      });

      login(response.data.token, response.data.user, rememberMe);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(200,155,109,0.22),_transparent_34%),linear-gradient(135deg,_rgba(255,250,243,0.95),_rgba(248,248,248,1))] p-4 dark:bg-[radial-gradient(circle_at_top_left,_rgba(200,155,109,0.2),_transparent_34%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(15,23,42,1))]">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/60 bg-white/75 shadow-[0_40px_90px_-30px_rgba(111,78,55,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-[#6F4E37] via-[#8a5a3c] to-[#C89B6D] p-8 text-white lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.2),_transparent_32%)]" />
          <div className="relative space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Coffee className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#f7e0c0]">KOPI SELON</p>
              <h1 className="mt-2 text-3xl font-semibold">Employee Management System</h1>
            </div>
            <p className="max-w-md text-sm text-[#fce8d0] sm:text-base">
              Pantau absensi, shift, dan kinerja tim dengan pengalaman digital yang modern, cepat, dan elegan.
            </p>
          </div>
          <div className="relative rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4" />
              Premium workspace
            </div>
            <p className="mt-2 text-sm text-[#fce8d0]">Desain yang konsisten untuk administrator, owner, staff, dan karyawan.</p>
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-md space-y-6">
            <div className="space-y-2 text-center lg:text-left">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6F4E37] dark:text-[#e9c79b]">Masuk akun</p>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Selamat datang kembali</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Masukkan kredensial Anda untuk mengakses dashboard.</p>
              {isExpired ? (
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Sesi Anda telah kadaluarsa. Silakan masuk kembali.</p>
              ) : null}
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="username">Username</label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    required
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="password">Password</label>
                  <a href="#" className="text-sm font-medium text-[#6F4E37] hover:underline dark:text-[#e9c79b]">Lupa password?</a>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    required
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex h-5 w-5 items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#6F4E37] focus:ring-[#6F4E37]"
                />
                Ingat saya
              </label>

              {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">{error}</div> : null}

              <button
                type="submit"
                disabled={isLoading}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#6F4E37] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5a3d2b] disabled:pointer-events-none disabled:opacity-60"
              >
                {isLoading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
