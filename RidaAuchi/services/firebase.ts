import Constants from 'expo-constants';
import { getApps, initializeApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getFirestore,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED,
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebase?.apiKey ?? '',
  authDomain: Constants.expoConfig?.extra?.firebase?.authDomain ?? '',
  projectId: Constants.expoConfig?.extra?.firebase?.projectId ?? '',
  storageBucket: Constants.expoConfig?.extra?.firebase?.storageBucket ?? '',
  messagingSenderId: Constants.expoConfig?.extra?.firebase?.messagingSenderId ?? '',
  appId: Constants.expoConfig?.extra?.firebase?.appId ?? '',
  measurementId: Constants.expoConfig?.extra?.firebase?.measurementId ?? '',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  authInstance = getAuth(app);
}

export const auth = authInstance;

initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
});

export const db = getFirestore(app);

const getTimestampValue = (value: any) => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') return new Date(value).getTime();
  if (value?.toDate instanceof Function) return value.toDate().getTime();
  return 0;
};

export const getUserProfile = async (userId: string) => {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    return userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const createRide = async (rideData: any) => {
  try {
    const docRef = await addDoc(collection(db, 'rides'), {
      ...rideData,
      createdAt: serverTimestamp(),
      status: 'searching',
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating ride:', error);
    throw error;
  }
};

export const updateRideStatus = async (rideId: string, status: string, additionalData = {}) => {
  try {
    const rideRef = doc(db, 'rides', rideId);
    await updateDoc(rideRef, {
      status,
      ...additionalData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating ride:', error);
    throw error;
  }
};

export const getRide = async (rideId: string) => {
  try {
    const rideRef = doc(db, 'rides', rideId);
    const rideSnap = await getDoc(rideRef);
    return rideSnap.exists() ? { id: rideSnap.id, ...rideSnap.data() } : null;
  } catch (error) {
    console.error('Error getting ride:', error);
    throw error;
  }
};

export const getUserRides = async (userId: string) => {
  try {
    const ridesQuery = query(
      collection(db, 'rides'),
      where('riderId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const querySnapshot = await getDocs(ridesQuery);
    return querySnapshot.docs.map((rideDoc) => ({ id: rideDoc.id, ...rideDoc.data() }));
  } catch (error) {
    console.error('Error getting user rides:', error);
    return [];
  }
};

export const getAvailableRides = async () => {
  try {
    const ridesQuery = query(
      collection(db, 'rides'),
      where('status', '==', 'searching'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const querySnapshot = await getDocs(ridesQuery);
    return querySnapshot.docs.map((rideDoc) => ({ id: rideDoc.id, ...rideDoc.data() }));
  } catch (error) {
    console.error('Error getting available rides:', error);
    return [];
  }
};

export const acceptRide = async (rideId: string, driverId: string, driverName: string) => {
  const rideRef = doc(db, 'rides', rideId);

  try {
    await runTransaction(db, async (transaction) => {
      const rideSnap = await transaction.get(rideRef);

      if (!rideSnap.exists()) {
        throw new Error('Ride no longer exists');
      }

      const ride = rideSnap.data();
      if (ride.status !== 'searching') {
        throw new Error('Ride was already taken');
      }

      transaction.update(rideRef, {
        driverId,
        driverName,
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    return true;
  } catch (error) {
    console.error('Error accepting ride:', error);
    throw error;
  }
};

export const getDriverRides = async (driverId: string) => {
  try {
    const ridesQuery = query(
      collection(db, 'rides'),
      where('driverId', '==', driverId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const querySnapshot = await getDocs(ridesQuery);
    return querySnapshot.docs.map((rideDoc) => ({ id: rideDoc.id, ...rideDoc.data() }));
  } catch (error) {
    console.error('Error getting driver rides:', error);
    return [];
  }
};
