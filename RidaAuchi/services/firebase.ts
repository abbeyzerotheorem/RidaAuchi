import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCI5GuTTd5sNKdIXBETbLnjM77lzF1cGRw",
  authDomain: "edomove-cb308.firebaseapp.com",
  projectId: "edomove-cb308",
  storageBucket: "edomove-cb308.firebasestorage.app",
  messagingSenderId: "845157752128",
  appId: "1:845157752128:web:74243da6a49bcce4d06ea5",
  measurementId: "G-BMKBXNYD5Z"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

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
      createdAt: new Date(),
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
      updatedAt: new Date().toISOString(),
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
      limit(50)
    );
    const querySnapshot = await getDocs(ridesQuery);
    const rides = querySnapshot.docs.map((rideDoc) => ({ id: rideDoc.id, ...rideDoc.data() }));
    return rides.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));
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
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
