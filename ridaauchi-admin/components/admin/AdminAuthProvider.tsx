'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { clearAuthCookie, setAuthCookie } from '@/lib/auth-cookie';

interface AdminAuthContextValue {
  user: User | null;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({
  children,
  loadingFallback,
}: {
  children: React.ReactNode;
  loadingFallback: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        clearAuthCookie();
        router.replace('/login');
        return;
      }

      const adminCheck = await verifyAdminAccess(currentUser);
      if (!adminCheck.ok) {
        clearAuthCookie();
        await signOut(auth);
        router.replace('/login');
        return;
      }

      await setAuthCookie(currentUser);
      setUser(currentUser);
      setAuthorized(true);
      setLoading(false);
    });

    return unsubscribe;
  }, [router]);

  const logout = async () => {
    clearAuthCookie();
    await signOut(auth);
    router.replace('/login');
  };

  if (loading || !authorized) {
    return loadingFallback;
  }

  return (
    <AdminAuthContext.Provider value={{ user, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}
