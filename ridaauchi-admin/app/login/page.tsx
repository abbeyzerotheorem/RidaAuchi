'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { setAuthCookie, clearAuthCookie } from '@/lib/auth-cookie';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

function getLoginErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code: string }).code)
    : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return error instanceof Error ? error.message : 'Unable to log in. Please try again.';
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const adminCheck = await verifyAdminAccess(user);
        if (adminCheck.ok) {
          await setAuthCookie(user);
          router.replace('/dashboard');
          return;
        }

        clearAuthCookie();
        await signOut(auth);
        setError(adminCheck.message);
      }
      setCheckingSession(false);
    });

    return unsubscribe;
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const adminCheck = await verifyAdminAccess(userCredential.user);

      if (!adminCheck.ok) {
        clearAuthCookie();
        await signOut(auth);
        setError(adminCheck.message);
        return;
      }

      await setAuthCookie(userCredential.user);
      router.replace('/dashboard');
    } catch (err) {
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#F04E05' }}>
        <Image
          src="/icon.png"
          alt="RidaAuchi"
          width={160}
          height={160}
          className="mb-4 w-40 h-auto"
          priority
        />
        <p className="text-white text-lg">Checking session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#F04E05' }}>
      <Image
        src="/icon.png"
        alt="RidaAuchi"
        width={240}
        height={240}
        className="mb-6 w-48 h-auto"
        priority
      />
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold" style={{ color: '#F04E05' }}>Admin Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Admin accounts only</p>
        </div>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            className="w-full p-3 mb-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            className="w-full p-3 mb-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
          {error && (
            <p className="text-red-500 text-sm mb-3">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 rounded-lg text-white font-semibold disabled:opacity-50"
            style={{ backgroundColor: '#F04E05' }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
