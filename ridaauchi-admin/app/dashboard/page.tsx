'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AppUser, Ride } from '@/lib/types';
import {
  filterDrivers,
  filterRiders,
  getFirestoreErrorMessage,
  loadAllRides,
  loadAllUsers,
} from '@/lib/firestore-helpers';
import { formatDate } from '@/lib/format';
import StatusBadge from '@/components/admin/StatusBadge';
import ErrorBanner from '@/components/admin/ErrorBanner';
import PageHeader from '@/components/admin/PageHeader';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalRides: 0,
    totalDrivers: 0,
    totalRiders: 0,
    completedRides: 0,
    pendingDrivers: 0,
    revenue: 0,
  });
  const [recentRides, setRecentRides] = useState<Ride[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [rides, users] = await Promise.all([loadAllRides(), loadAllUsers()]);

      const drivers = filterDrivers(users);
      const riders = filterRiders(users);
      const pending = drivers.filter((d) => !d.isApproved && !d.isRejected && !d.isSuspended);
      const completedRides = rides.filter((r) => r.status === 'completed');
      const totalRevenue = completedRides.reduce((sum, r) => sum + (r.estimatedFare || 0), 0);

      setStats({
        totalRides: rides.length,
        totalDrivers: drivers.length,
        totalRiders: riders.length,
        completedRides: completedRides.length,
        pendingDrivers: pending.length,
        revenue: totalRevenue,
      });
      setRecentRides(rides.slice(0, 10));
      setPendingDrivers(pending.slice(0, 5));
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(getFirestoreErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Platform overview at a glance"
        onRefresh={loadData}
        refreshing={loading}
      />

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {loading && !error ? (
        <p className="text-gray-500">Loading overview...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            <StatCard label="Total Rides" value={stats.totalRides} />
            <StatCard label="Completed" value={stats.completedRides} valueClass="text-green-600" />
            <StatCard label="Active Drivers" value={stats.totalDrivers - stats.pendingDrivers} />
            <StatCard label="Pending Approval" value={stats.pendingDrivers} valueClass="text-orange-600" />
            <StatCard label="Total Riders" value={stats.totalRiders} />
            <StatCard label="Revenue (₦)" value={`₦${stats.revenue.toLocaleString()}`} valueClass="text-green-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Recent Rides</h2>
                  <p className="text-sm text-gray-500">Last 10 rides on the platform</p>
                </div>
                <Link href="/dashboard/rides" className="text-sm font-medium" style={{ color: '#F04E05' }}>
                  View all
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold text-gray-600">Time</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-600">Fare</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRides.map((ride) => (
                      <tr key={ride.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 text-sm text-gray-600">{formatDate(ride.createdAt)}</td>
                        <td className="p-3 text-sm font-semibold" style={{ color: '#F04E05' }}>
                          ₦{ride.estimatedFare || 0}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={ride.status} />
                        </td>
                      </tr>
                    ))}
                    {recentRides.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-gray-500">
                          No rides yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Pending Drivers</h2>
                    <p className="text-sm text-gray-500">{stats.pendingDrivers} awaiting review</p>
                  </div>
                  <Link href="/dashboard/drivers" className="text-sm font-medium" style={{ color: '#F04E05' }}>
                    Review all
                  </Link>
                </div>
                {pendingDrivers.length === 0 ? (
                  <p className="text-sm text-gray-500">No pending driver approvals.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingDrivers.map((driver) => (
                      <div key={driver.id} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900">{driver.name || 'Unnamed Driver'}</p>
                        <p className="text-sm text-gray-500">{driver.email}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold mb-2 text-gray-900">Quick Actions</h2>
                <p className="text-sm text-gray-500 mb-4">Jump to common admin tasks</p>
                <div className="space-y-3">
                  <QuickLink href="/dashboard/drivers" label="Review pending drivers" />
                  <QuickLink href="/dashboard/rides" label="Monitor all rides" />
                  <QuickLink href="/dashboard/riders" label="Manage riders" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClass = '',
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <p className="text-gray-500 text-sm">{label}</p>
      <p className={`text-2xl font-bold text-gray-900 ${valueClass}`}>{value}</p>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition text-sm font-medium text-gray-700"
    >
      {label}
    </Link>
  );
}
