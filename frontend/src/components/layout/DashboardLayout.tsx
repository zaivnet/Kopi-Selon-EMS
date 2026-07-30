import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="flex min-h-screen overflow-hidden bg-transparent text-foreground">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onToggle={() => setCollapsed((value) => !value)}
      />

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-300',
          collapsed ? 'lg:pl-20' : 'lg:pl-72'
        )}
      >
        <Navbar
          collapsed={collapsed}
          onMenuClick={() => setMobileOpen(true)}
          onSidebarToggle={() => setCollapsed((value) => !value)}
        />
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
