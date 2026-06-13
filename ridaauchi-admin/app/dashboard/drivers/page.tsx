'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser, DriverFilter } from '@/lib/types';
import { filterDrivers, getFirestoreErrorMessage, loadAllUsers } from '@/lib/firestore-helpers';
import { getDriverStatus, getDriverStatusColor } from '@/lib/format';
import ErrorBanner from '@/components/admin/ErrorBanner';
import PageHeader from '@/components/admin/PageHeader';
import ActionMessage from '@/components/admin/ActionMessage';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [filter, setFilter] = useState<DriverFilter>('all');
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [reasonModal, setReasonModal] = useState<{
    driverId: string;
    action: 'reject' | 'suspend';
  } | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    setLoading(true);
    setError('');

    try {
      const users = await loadAllUsers();
      setDrivers(filterDrivers(users));
    } catch (err) {
      console.error('Error loading drivers:', err);
      setError(getFirestoreErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const status = getDriverStatus(driver);
      const matchesFilter = filter === 'all' || status === filter;
      const queryText = search.trim().toLowerCase();
      const matchesSearch =
        !queryText ||
        driver.name?.toLowerCase().includes(queryText) ||
        driver.email?.toLowerCase().includes(queryText);

      return matchesFilter && matchesSearch;
    });
  }, [drivers, filter, search]);

  const approveDriver = async (driverId: string) => {
    setActionId(driverId);
    setActionMessage(null);

    try {
      await updateDoc(doc(db, 'users', driverId), {
        isApproved: true,
        isRejected: false,
        isSuspended: false,
        approvedAt: new Date().toISOString(),
        rejectionReason: null,
        suspensionReason: null,
      });
      await loadDrivers();
      setActionMessage({ text: 'Driver approved successfully.', type: 'success' });
    } catch (err) {
      setActionMessage({ text: getFirestoreErrorMessage(err), type: 'error' });
    } finally {
      setActionId(null);
    }
  };

  const rejectDriver = async (driverId: string, rejectionReason: string) => {
    setActionId(driverId);
    setActionMessage(null);

    try {
      await updateDoc(doc(db, 'users', driverId), {
        isApproved: false,
        isRejected: true,
        isSuspended: false,
        rejectedAt: new Date().toISOString(),
        rejectionReason: rejectionReason.trim() || 'Rejected by admin',
      });
      await loadDrivers();
      setActionMessage({ text: 'Driver rejected.', type: 'success' });
    } catch (err) {
      setActionMessage({ text: getFirestoreErrorMessage(err), type: 'error' });
    } finally {
      setActionId(null);
    }
  };

  const suspendDriver = async (driverId: string, suspensionReason: string) => {
    setActionId(driverId);
    setActionMessage(null);

    try {
      await updateDoc(doc(db, 'users', driverId), {
        isSuspended: true,
        suspendedAt: new Date().toISOString(),
        suspensionReason: suspensionReason.trim() || 'Suspended by admin',
      });
      await loadDrivers();
      setActionMessage({ text: 'Driver suspended.', type: 'success' });
    } catch (err) {
      setActionMessage({ text: getFirestoreErrorMessage(err), type: 'error' });
    } finally {
      setActionId(null);
    }
  };

  const unsuspendDriver = async (driverId: string) => {
    setActionId(driverId);
    setActionMessage(null);

    try {
      await updateDoc(doc(db, 'users', driverId), {
        isSuspended: false,
        suspendedAt: null,
        suspensionReason: null,
      });
      await loadDrivers();
      setActionMessage({ text: 'Driver unsuspended.', type: 'success' });
    } catch (err) {
      setActionMessage({ text: getFirestoreErrorMessage(err), type: 'error' });
    } finally {
      setActionId(null);
    }
  };

  const handleReasonSubmit = async () => {
    if (!reasonModal) return;

    if (reasonModal.action === 'reject') {
      await rejectDriver(reasonModal.driverId, reason);
    } else {
      await suspendDriver(reasonModal.driverId, reason);
    }

    setReasonModal(null);
    setReason('');
  };

  return (
    <div>
      <PageHeader
        title="Drivers"
        description="Approve, reject, or suspend driver accounts"
        onRefresh={loadDrivers}
        refreshing={loading}
      />

      {error && <ErrorBanner message={error} onRetry={loadDrivers} />}
      {actionMessage && <ActionMessage message={actionMessage.text} type={actionMessage.type} />}

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 p-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as DriverFilter)}
          className="p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">All drivers</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="space-y-3">
        {loading && !error ? (
          <p className="text-gray-500">Loading drivers...</p>
        ) : filteredDrivers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No drivers match your filters.
          </div>
        ) : (
          filteredDrivers.map((driver) => {
            const status = getDriverStatus(driver);
            const busy = actionId === driver.id;

            return (
              <div key={driver.id} className="bg-white rounded-lg shadow p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">{driver.name || 'Unnamed Driver'}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getDriverStatusColor(status)}`}>
                      {status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{driver.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Joined: {driver.createdAt ? new Date(driver.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                  {driver.rejectionReason && (
                    <p className="text-xs text-red-600 mt-1">Rejection: {driver.rejectionReason}</p>
                  )}
                  {driver.suspensionReason && (
                    <p className="text-xs text-gray-600 mt-1">Suspension: {driver.suspensionReason}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {(status === 'pending' || status === 'rejected') && (
                    <button
                      onClick={() => approveDriver(driver.id)}
                      disabled={busy}
                      className="px-4 py-2 rounded text-white text-sm disabled:opacity-50"
                      style={{ backgroundColor: '#4CAF50' }}
                    >
                      Approve
                    </button>
                  )}
                  {status !== 'rejected' && status !== 'suspended' && (
                    <button
                      onClick={() => setReasonModal({ driverId: driver.id, action: 'reject' })}
                      disabled={busy}
                      className="px-4 py-2 rounded bg-red-100 text-red-700 text-sm hover:bg-red-200 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  )}
                  {status === 'suspended' ? (
                    <button
                      onClick={() => unsuspendDriver(driver.id)}
                      disabled={busy}
                      className="px-4 py-2 rounded bg-blue-100 text-blue-700 text-sm hover:bg-blue-200 disabled:opacity-50"
                    >
                      Unsuspend
                    </button>
                  ) : (
                    <button
                      onClick={() => setReasonModal({ driverId: driver.id, action: 'suspend' })}
                      disabled={busy}
                      className="px-4 py-2 rounded bg-gray-200 text-gray-800 text-sm hover:bg-gray-300 disabled:opacity-50"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {reasonModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-2 capitalize text-gray-900">{reasonModal.action} driver</h3>
            <p className="text-sm text-gray-500 mb-4">
              Add an optional reason. This will be stored on the driver profile.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Reason for ${reasonModal.action}...`}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setReasonModal(null);
                  setReason('');
                }}
                className="px-4 py-2 rounded border border-gray-300 text-sm text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleReasonSubmit}
                className="px-4 py-2 rounded text-white text-sm"
                style={{ backgroundColor: '#F04E05' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
