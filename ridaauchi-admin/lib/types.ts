export type RideStatus =
  | 'searching'
  | 'accepted'
  | 'arrived'
  | 'started'
  | 'completed'
  | 'cancelled';

export interface Ride {
  id: string;
  pickupAddress?: string;
  destinationAddress?: string;
  estimatedFare?: number;
  status?: RideStatus | string;
  createdAt?: string | Date | { toDate?: () => Date };
  riderId?: string;
  driverId?: string;
  driverName?: string;
}

export interface AppUser {
  id: string;
  name?: string;
  email?: string;
  role?: 'admin' | 'driver' | 'rider';
  createdAt?: string;
  isApproved?: boolean;
  isRejected?: boolean;
  isSuspended?: boolean;
  rejectionReason?: string;
  suspensionReason?: string;
  approvedAt?: string;
  rejectedAt?: string;
  suspendedAt?: string;
}

export type DriverFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'suspended';
