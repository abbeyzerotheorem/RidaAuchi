'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Ride, RideStatus } from '@/lib/types';
import { getFirestoreErrorMessage, loadAllRides } from '@/lib/firestore-helpers';
import { formatDate, RIDE_STATUSES } from '@/lib/format';
import StatusBadge from '@/components/admin/StatusBadge';
import ErrorBanner from '@/components/admin/ErrorBanner';
import PageHeader from '@/components/admin/PageHeader';
import ActionMessage from '@/components/admin/ActionMessage';

export default function RidesPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [statusFilter, setStatusFilter] = useState<RideStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    loadRides();
  }, []);

  const loadRides = async () => {
    setLoading(true);
    setError('');

    try {
      setRides(await loadAllRides());
    } catch (err) {
      console.error('Error loading rides:', err);
      setError(getFirestoreErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const filteredRides = useMemo(() => {
    return rides.filter((ride) => {
      const matchesStatus = statusFilter === 'all' || ride.status === statusFilter;
      const queryText = search.trim().toLowerCase();
      const matchesSearch =
        !queryText ||
        ride.pickupAddress?.toLowerCase().includes(queryText) ||
        ride.destinationAddress?.toLowerCase().includes(queryText) ||
        ride.driverName?.toLowerCase().includes(queryText) ||
        ride.id.toLowerCase().includes(queryText);

      return matchesStatus && matchesSearch;
    });
  }, [rides, search, statusFilter]);

  const cancelRide = async (rideId: string) => {
    if (!confirm('Cancel this ride?')) return;

    setActionId(rideId);
    setActionMessage(null);

    try {
      await updateDoc(doc(db, 'rides', rideId), {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'admin',
      });
      await loadRides();
      setActionMessage({ text: 'Ride cancelled successfully.', type: 'success' });
    } catch (err) {
      setActionMessage({ text: getFirestoreErrorMessage(err), type: 'error' });
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Rides"
        description="View and manage all platform rides"
        onRefresh={loadRides}
        refreshing={loading}
      />

      {error && <ErrorBanner message={error} onRetry={loadRides} />}
      {actionMessage && <ActionMessage message={actionMessage.text} type={actionMessage.type} />}

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Search pickup, destination, driver, or ride ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 p-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RideStatus | 'all')}
          className="p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">All statuses</option>
          {RIDE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading && !error ? (
          <p className="p-8 text-center text-gray-500">Loading rides...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">Time</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">Pickup</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">Destination</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">Driver</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">Fare</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRides.map((ride) => (
                  <tr key={ride.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(ride.createdAt)}
                    </td>
                    <td className="p-3 text-sm text-gray-700 max-w-xs truncate">
                      {ride.pickupAddress || 'N/A'}
                    </td>
                    <td className="p-3 text-sm text-gray-700 max-w-xs truncate">
                      {ride.destinationAddress || 'N/A'}
                    </td>
                    <td className="p-3 text-sm text-gray-700">{ride.driverName || '—'}</td>
                    <td className="p-3 text-sm font-semibold whitespace-nowrap" style={{ color: '#F04E05' }}>
                      ₦{ride.estimatedFare || 0}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={ride.status} />
                    </td>
                    <td className="p-3">
                      {ride.status !== 'completed' && ride.status !== 'cancelled' && (
                        <button
                          onClick={() => cancelRide(ride.id)}
                          disabled={actionId === ride.id}
                          className="px-3 py-1.5 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                        >
                          {actionId === ride.id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredRides.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      No rides match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500 mt-3">
        Showing {filteredRides.length} of {rides.length} rides
      </p>
    </div>
  );
}
