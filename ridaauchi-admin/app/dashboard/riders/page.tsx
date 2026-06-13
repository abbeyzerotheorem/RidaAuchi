'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser } from '@/lib/types';
import { filterRiders, getFirestoreErrorMessage, loadAllUsers } from '@/lib/firestore-helpers';
import ErrorBanner from '@/components/admin/ErrorBanner';
import PageHeader from '@/components/admin/PageHeader';
import ActionMessage from '@/components/admin/ActionMessage';

export default function RidersPage() {
  const [riders, setRiders] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    loadRiders();
  }, []);

  const loadRiders = async () => {
    setLoading(true);
    setError('');

    try {
      const users = await loadAllUsers();
      setRiders(filterRiders(users));
    } catch (err) {
      console.error('Error loading riders:', err);
      setError(getFirestoreErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const filteredRiders = useMemo(() => {
    const queryText = search.trim().toLowerCase();
    if (!queryText) return riders;

    return riders.filter(
      (rider) =>
        rider.name?.toLowerCase().includes(queryText) ||
        rider.email?.toLowerCase().includes(queryText)
    );
  }, [riders, search]);

  const toggleSuspend = async (rider: AppUser) => {
    const suspending = !rider.isSuspended;
    const message = suspending
      ? 'Suspend this rider? They will not be able to use the app.'
      : 'Unsuspend this rider?';

    if (!confirm(message)) return;

    setActionId(rider.id);
    setActionMessage(null);

    try {
      await updateDoc(doc(db, 'users', rider.id), {
        isSuspended: suspending,
        suspendedAt: suspending ? new Date().toISOString() : null,
        suspensionReason: suspending ? 'Suspended by admin' : null,
      });
      await loadRiders();
      setActionMessage({
        text: suspending ? 'Rider suspended.' : 'Rider unsuspended.',
        type: 'success',
      });
    } catch (err) {
      setActionMessage({ text: getFirestoreErrorMessage(err), type: 'error' });
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Riders"
        description="View and manage rider accounts"
        onRefresh={loadRiders}
        refreshing={loading}
      />

      {error && <ErrorBanner message={error} onRetry={loadRiders} />}
      {actionMessage && <ActionMessage message={actionMessage.text} type={actionMessage.type} />}

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading && !error ? (
          <p className="p-8 text-center text-gray-500">Loading riders...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">Name</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">Email</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">Joined</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRiders.map((rider) => (
                  <tr key={rider.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 text-sm font-medium text-gray-900">{rider.name || 'Unnamed'}</td>
                    <td className="p-3 text-sm text-gray-600">{rider.email}</td>
                    <td className="p-3 text-sm text-gray-600">
                      {rider.createdAt ? new Date(rider.createdAt).toLocaleDateString() : 'Unknown'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          rider.isSuspended
                            ? 'bg-gray-200 text-gray-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {rider.isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleSuspend(rider)}
                        disabled={actionId === rider.id}
                        className={`px-3 py-1.5 text-xs rounded disabled:opacity-50 ${
                          rider.isSuspended
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }`}
                      >
                        {actionId === rider.id
                          ? 'Updating...'
                          : rider.isSuspended
                            ? 'Unsuspend'
                            : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRiders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      No riders match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500 mt-3">
        Showing {filteredRiders.length} of {riders.length} riders
      </p>
    </div>
  );
}
