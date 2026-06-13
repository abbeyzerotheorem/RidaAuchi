import {
  collection,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser, Ride } from '@/lib/types';

export function getFirestoreErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code: string }).code)
      : '';

  if (code === 'permission-denied') {
    return 'Firestore permission denied. Deploy the admin security rules so admin users can read and update rides and users.';
  }

  if (code === 'failed-precondition') {
    return 'Firestore index required. Check the browser console for the index creation link.';
  }

  return error instanceof Error ? error.message : 'Something went wrong while loading data.';
}

export function normalizeUserRole(role: unknown): string {
  return String(role ?? '').trim().toLowerCase();
}

export function getTimestampValue(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    return (value as { seconds: number }).seconds * 1000;
  }
  return 0;
}

export function sortRidesByDate(rides: Ride[]): Ride[] {
  return [...rides].sort(
    (a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt)
  );
}

export async function loadAllRides(): Promise<Ride[]> {
  try {
    const ridesSnap = await getDocs(
      query(collection(db, 'rides'), orderBy('createdAt', 'desc'))
    );
    return ridesSnap.docs.map((entry) => ({ id: entry.id, ...entry.data() })) as Ride[];
  } catch {
    const ridesSnap = await getDocs(collection(db, 'rides'));
    const rides = ridesSnap.docs.map((entry) => ({ id: entry.id, ...entry.data() })) as Ride[];
    return sortRidesByDate(rides);
  }
}

export async function loadAllUsers(): Promise<AppUser[]> {
  const usersSnap = await getDocs(collection(db, 'users'));
  return usersSnap.docs.map((entry) => ({ id: entry.id, ...entry.data() })) as AppUser[];
}

export function filterDrivers(users: AppUser[]): AppUser[] {
  return users.filter((user) => normalizeUserRole(user.role) === 'driver');
}

export function filterRiders(users: AppUser[]): AppUser[] {
  return users.filter((user) => normalizeUserRole(user.role) === 'rider');
}
