import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebase';

export type AdminCheckResult =
  | { ok: true }
  | { ok: false; message: string };

function normalizeRole(role: unknown): string {
  return String(role ?? '').trim().toLowerCase();
}

function isAdminData(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false;
  if (normalizeRole(data.role) === 'admin') return true;
  if (data.isAdmin === true) return true;
  return false;
}

function getFirestoreErrorCode(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error) {
    return String((error as { code: string }).code);
  }
  return '';
}

export async function verifyAdminAccess(user: Pick<User, 'uid' | 'email'>): Promise<AdminCheckResult> {
  try {
    const uidDoc = await getDoc(doc(db, 'users', user.uid));

    if (uidDoc.exists()) {
      const data = uidDoc.data();
      if (isAdminData(data)) {
        return { ok: true };
      }

      const currentRole = normalizeRole(data?.role) || 'none';
      return {
        ok: false,
        message: `Your Firestore profile exists but role is "${currentRole}", not "admin". In Firebase Console, open users/${user.uid} and set role to admin (lowercase).`,
      };
    }

    if (user.email) {
      const emailQuery = query(
        collection(db, 'users'),
        where('email', '==', user.email),
        limit(5)
      );
      const emailSnap = await getDocs(emailQuery);
      const adminByEmail = emailSnap.docs.find((entry) => isAdminData(entry.data()));

      if (adminByEmail) {
        return {
          ok: false,
          message: `An admin profile was found for ${user.email}, but its document ID is "${adminByEmail.id}" instead of your Auth UID "${user.uid}". Copy the admin fields into users/${user.uid} or recreate the document with the UID as the document ID.`,
        };
      }
    }

    return {
      ok: false,
      message: `No Firestore profile found at users/${user.uid}. Create a document using your Firebase Auth UID as the document ID with role set to "admin".`,
    };
  } catch (error) {
    const code = getFirestoreErrorCode(error);

    if (code === 'permission-denied') {
      return {
        ok: false,
        message:
          'Cannot read your user profile from Firestore (permission denied). Update Firestore rules to allow authenticated users to read users/{userId} when userId matches their UID.',
      };
    }

    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unable to verify admin access.',
    };
  }
}

/** @deprecated Use verifyAdminAccess for detailed errors */
export async function verifyAdminRole(uid: string): Promise<boolean> {
  const result = await verifyAdminAccess({ uid, email: null });
  return result.ok;
}
