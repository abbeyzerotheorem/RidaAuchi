import type { RideStatus } from '@/lib/types';

export function formatDate(value: unknown): string {
  if (!value) return 'Unknown';

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toLocaleString();
  }

  return 'Unknown';
}

export function getRideStatusColor(status?: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'searching':
      return 'bg-yellow-100 text-yellow-800';
    case 'accepted':
      return 'bg-blue-100 text-blue-800';
    case 'arrived':
      return 'bg-purple-100 text-purple-800';
    case 'started':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export const RIDE_STATUSES: RideStatus[] = [
  'searching',
  'accepted',
  'arrived',
  'started',
  'completed',
  'cancelled',
];

export function getDriverStatus(user: {
  isApproved?: boolean;
  isRejected?: boolean;
  isSuspended?: boolean;
}): 'pending' | 'approved' | 'rejected' | 'suspended' {
  if (user.isSuspended) return 'suspended';
  if (user.isRejected) return 'rejected';
  if (user.isApproved) return 'approved';
  return 'pending';
}

export function getDriverStatusColor(status: ReturnType<typeof getDriverStatus>): string {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'suspended':
      return 'bg-gray-200 text-gray-800';
    default:
      return 'bg-yellow-100 text-yellow-800';
  }
}
