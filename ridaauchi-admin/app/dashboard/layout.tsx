'use client';

import { useState } from 'react';
import LoadingScreen from '@/components/admin/LoadingScreen';
import Sidebar from '@/components/admin/Sidebar';
import { AdminAuthProvider, useAdminAuth } from '@/components/admin/AdminAuthProvider';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 shadow-md"
          style={{ backgroundColor: '#F04E05' }}
        >
          <button
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
            className="text-white p-2 rounded hover:bg-orange-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="text-white font-bold">RidaAuchi Admin</p>
          <div className="w-10" />
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider loadingFallback={<LoadingScreen message="Loading admin panel..." />}>
      <DashboardShell>{children}</DashboardShell>
    </AdminAuthProvider>
  );
}
