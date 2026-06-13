import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import {
  auth,
  db,
  createRide,
  updateRideStatus,
  getUserRides,
  getUserProfile,
  getAvailableRides,
  acceptRide,
  getDriverRides,
} from './services/firebase';
import { 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { calculateDistanceAndFare } from './services/distanceService';
import { TextInput } from 'react-native'; // Add this
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'; // Add this
import { setDoc } from 'firebase/firestore'; // Add this
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

// Replace JOHANNESBURG_DESTINATIONS with:
const AUCHI_DESTINATIONS = [
  { name: 'Federal Poly Gate', lat: 7.0736, lng: 6.2636, description: 'Main Campus Entrance' },
  { name: 'Auchi Main Market', lat: 7.0720, lng: 6.2650, description: 'Central Market' },
  { name: 'General Hospital', lat: 7.0745, lng: 6.2600, description: 'Auchi General Hospital' },
  { name: 'Iyakpi Junction', lat: 7.0680, lng: 6.2580, description: 'Busy Junction' },
  { name: 'Auchi Central Mosque', lat: 7.0710, lng: 6.2620, description: 'Major Landmark' },
  { name: 'South Ibie', lat: 7.0800, lng: 6.2700, description: 'Residential Area' },
  { name: 'Jattu Road', lat: 7.0650, lng: 6.2550, description: 'Main Road' },
  { name: 'Auchi Stadium', lat: 7.0760, lng: 6.2610, description: 'Sports Complex' },
  { name: 'Police Station', lat: 7.0700, lng: 6.2590, description: 'Auchi Police HQ' },
  { name: 'Otua Road', lat: 7.0690, lng: 6.2640, description: 'Popular Street' }
]

// ============ LOGIN SCREEN ============
function LoginScreen({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.authContainer}>
      <View style={styles.authCard}>
        <Text style={styles.authTitle}>RidaAuchi</Text>
        <Text style={styles.authSubtitle}>Your ride in Auchi, Edo State</Text>
        <Text style={styles.authHint}>Sign in as a rider or driver</Text>
        
        <TextInput
          style={styles.authInput}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          style={styles.authInput}
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={styles.authButton} 
          onPress={handleLogin}
          disabled={loading}>
          <Text style={styles.authButtonText}>
            {loading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={onSwitchToRegister}>
          <Text style={styles.authLink}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RegisterScreen({ onRegister, onSwitchToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('rider');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userData: Record<string, string | boolean> = {
        name,
        email,
        role,
        createdAt: new Date().toISOString(),
      };

      if (role === 'driver') {
        userData.isApproved = false;
      }

      await setDoc(doc(db, 'users', user.uid), userData);
      
      onRegister();
    } catch (error) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.authContainer}>
      <View style={styles.authCard}>
        <Text style={styles.authTitle}>RidaAuchi</Text>
        <Text style={styles.authSubtitle}>Create your account</Text>
        
        <Text style={styles.roleLabel}>I want to sign up as</Text>
        <View style={styles.roleToggle}>
          <TouchableOpacity
            style={[styles.roleOption, role === 'rider' && styles.roleOptionActive]}
            onPress={() => setRole('rider')}>
            <Text style={[styles.roleOptionText, role === 'rider' && styles.roleOptionTextActive]}>
              Rider
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleOption, role === 'driver' && styles.roleOptionActive]}
            onPress={() => setRole('driver')}>
            <Text style={[styles.roleOptionText, role === 'driver' && styles.roleOptionTextActive]}>
              Driver
            </Text>
          </TouchableOpacity>
        </View>

        {role === 'driver' && (
          <Text style={styles.driverNote}>
            Driver accounts require admin approval before you can accept rides.
          </Text>
        )}
        
        <TextInput
          style={styles.authInput}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
        />
        
        <TextInput
          style={styles.authInput}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          style={styles.authInput}
          placeholder="Password (min 6 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={styles.authButton} 
          onPress={handleRegister}
          disabled={loading}>
          <Text style={styles.authButtonText}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={onSwitchToLogin}>
          <Text style={styles.authLink}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PendingApprovalScreen({ onLogout }) {
  return (
    <View style={styles.centerContainer}>
      <View style={styles.pendingCard}>
        <Text style={styles.pendingTitle}>Approval Pending</Text>
        <Text style={styles.pendingText}>
          Your driver account is waiting for admin approval. You will be able to accept rides once approved.
        </Text>
        <TouchableOpacity style={styles.authButton} onPress={onLogout}>
          <Text style={styles.authButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============ DRIVER APP ============
function DriverApp() {
  const [user, setUser] = useState(null);
  const [availableRides, setAvailableRides] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [currentRide, setCurrentRide] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [rideHistory, setRideHistory] = useState([]);
  const [rideListener, setRideListener] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadAvailableRides();
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOnline) {
      const interval = setInterval(loadAvailableRides, 5000);
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  useEffect(() => {
    return () => {
      if (rideListener) {
        rideListener();
      }
    };
  }, [rideListener]);

  const loadAvailableRides = async (force = false) => {
    if (!isOnline && !force) return;
    try {
      const rides = await getAvailableRides();
      setAvailableRides(rides);
    } catch (error) {
      console.error('Error loading rides:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAvailableRides(true);
    setRefreshing(false);
  };

  const handleAcceptRide = async (ride) => {
    Alert.alert(
      'Accept Ride',
      `Accept ride from ${ride.pickupAddress} to ${ride.destinationAddress}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Accept',
          onPress: async () => {
            try {
              await acceptRide(ride.id, user.uid, user.email);
              setCurrentRide(ride);
              setAvailableRides((prev) => prev.filter((item) => item.id !== ride.id));

              const listener = onSnapshot(doc(db, 'rides', ride.id), (docSnap) => {
                if (!docSnap.exists()) return;
                const rideData = { id: docSnap.id, ...docSnap.data() };

                setCurrentRide(rideData);

                if (rideData.status === 'cancelled') {
                  Alert.alert('Ride Cancelled', 'The rider cancelled this ride');
                  setCurrentRide(null);
                  setIsOnline(true);
                  setAvailableRides((prev) => prev.filter((item) => item.id !== ride.id));
                  if (listener) listener();
                  setRideListener(null);
                  loadAvailableRides(true);
                }
                if (rideData.status === 'completed') {
                  Alert.alert('Ride Completed', 'This ride is already completed');
                  setCurrentRide(null);
                  setIsOnline(true);
                  setAvailableRides((prev) => prev.filter((item) => item.id !== ride.id));
                  if (listener) listener();
                  setRideListener(null);
                  loadAvailableRides(true);
                }
              });

              setRideListener(() => listener);
              Alert.alert('Success', 'Ride accepted! Navigate to pickup.');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleRideAction = async (action) => {
    if (!currentRide) return;

    switch (action) {
      case 'arrived':
        await updateRideStatus(currentRide.id, 'arrived');
        setCurrentRide({ ...currentRide, status: 'arrived' });
        Alert.alert('Arrived', 'Rider has been notified');
        break;
      case 'start':
        await updateRideStatus(currentRide.id, 'started');
        setCurrentRide({ ...currentRide, status: 'started' });
        Alert.alert('Started', 'Ride in progress');
        break;
      case 'complete':
        if (rideListener) {
          rideListener();
          setRideListener(null);
        }
        await updateRideStatus(currentRide.id, 'completed', {
          completedAt: new Date().toISOString(),
        });
        Alert.alert('Complete', `Ride completed! Cash payment: ₦${currentRide.estimatedFare}`);
        setCurrentRide(null);
        setIsOnline(true);
        loadAvailableRides(true);
        break;
    }
  };

  const loadHistory = async () => {
    if (!user) return;
    const history = await getDriverRides(user.uid);
    setRideHistory(history);
    setShowHistory(true);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsOnline(false);
    setCurrentRide(null);
  };

  if (showHistory) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ride History</Text>
          <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.historyList}>
          {rideHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No rides yet</Text>
            </View>
          ) : (
            rideHistory.map((ride) => (
              <View key={ride.id} style={styles.historyCard}>
                <Text style={styles.historyDate}>
                  {new Date(ride.createdAt).toLocaleDateString()}
                </Text>
                <Text style={styles.historyPickup}>From: {ride.pickupAddress}</Text>
                <Text style={styles.historyDest}>To: {ride.destinationAddress}</Text>
                <Text style={styles.historyFare}>₦{ride.estimatedFare}</Text>
                <Text style={styles.driverHistoryStatus}>Status: {ride.status}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  if (currentRide) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Active Ride</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activeRideCard}>
          <Text style={styles.label}>From</Text>
          <Text style={styles.address}>{currentRide.pickupAddress}</Text>

          <Text style={styles.label}>To</Text>
          <Text style={styles.address}>{currentRide.destinationAddress}</Text>

          <View style={styles.fareBox}>
            <Text style={styles.fareAmount}>₦{currentRide.estimatedFare}</Text>
            <Text style={styles.fareNote}>Cash payment expected</Text>
          </View>

          <View style={styles.buttonGroup}>
            {currentRide.status === 'accepted' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleRideAction('arrived')}>
                <Text style={styles.actionButtonText}>Arrived at Pickup</Text>
              </TouchableOpacity>
            )}

            {currentRide.status === 'arrived' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleRideAction('start')}>
                <Text style={styles.actionButtonText}>Start Ride</Text>
              </TouchableOpacity>
            )}

            {currentRide.status === 'started' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleRideAction('complete')}>
                <Text style={styles.actionButtonText}>Complete Ride</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RidaAuchi Driver</Text>
        <Text style={styles.headerSubtitle}>Welcome, {user?.email}</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.onlineCard}>
        <Text style={styles.onlineLabel}>Driver Status</Text>
        <TouchableOpacity
          style={[styles.onlineButton, isOnline && styles.onlineButtonActive]}
          onPress={() => {
            const goingOnline = !isOnline;
            setIsOnline(goingOnline);
            if (goingOnline) {
              loadAvailableRides(true);
            }
          }}>
          <Text style={styles.onlineButtonText}>
            {isOnline ? '🟢 Online - Accepting Rides' : '⚫ Offline - Tap to Go Online'}
          </Text>
        </TouchableOpacity>
      </View>

      {isOnline && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Rides</Text>
            <TouchableOpacity onPress={() => loadAvailableRides(true)}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.ridesList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            {availableRides.length === 0 ? (
              <View style={styles.emptyRides}>
                <Text style={styles.emptyRidesText}>No rides available</Text>
                <Text style={styles.emptyRidesSubtext}>Check back soon!</Text>
              </View>
            ) : (
              availableRides.map((ride) => (
                <View key={ride.id} style={styles.rideCard}>
                  <Text style={styles.ridePickup}>📍 {ride.pickupAddress}</Text>
                  <Text style={styles.rideDest}>🎯 {ride.destinationAddress}</Text>
                  <View style={styles.rideFooter}>
                    <Text style={styles.rideFare}>₦{ride.estimatedFare}</Text>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleAcceptRide(ride)}>
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <TouchableOpacity style={styles.historyMainButton} onPress={loadHistory}>
            <Text style={styles.historyMainButtonText}>View Ride History</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ============ MAIN RIDE APP ============
function RideApp() {
  const [user, setUser] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [pickupAddress, setPickupAddress] = useState('Detecting...');
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState('pickup');
  const [estimatedFare, setEstimatedFare] = useState(null);
  const [rideDistance, setRideDistance] = useState(null);
  const [rideDuration, setRideDuration] = useState(null);
  const [rideStatus, setRideStatus] = useState(null);
  const [currentRideId, setCurrentRideId] = useState(null);
  const [unsubscribeRide, setUnsubscribeRide] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [rideHistory, setRideHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const lastNotifiedStatusRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      if (!user) return;
      
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Needed', 'Please enable location');
          setIsLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setCurrentLocation(location.coords);

        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (reverseGeocode.length > 0) {
          const geo = reverseGeocode[0];
          const addressParts = [geo.name, geo.street, geo.district, geo.city].filter(Boolean);
          setPickupAddress(addressParts.join(', ') || 'Your current location');
        }
      } catch (error) {
        Alert.alert('Error', 'Could not get your location');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    // Cleanup ride listener
    return () => {
      if (unsubscribeRide) {
        unsubscribeRide();
      }
    };
  }, [unsubscribeRide]);

  const loadRideHistory = async () => {
    if (!user) return;
    const history = await getUserRides(user.uid);
    setRideHistory(history);
    setShowHistory(true);
  };

  const handleRequestRide = async () => {
    if (!selectedDestination || !destinationCoords) {
      Alert.alert('Missing Info', 'Please select a destination');
      return;
    }
    
    if (!currentLocation) {
      Alert.alert('Error', 'Could not detect your location');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await calculateDistanceAndFare(
        { lat: currentLocation.latitude, lng: currentLocation.longitude },
        destinationCoords
      );
      
      setEstimatedFare(result.fare);
      setRideDistance(result.distanceKm);
      setRideDuration(result.durationMinutes);
      setStep('confirm');
    } catch (error) {
      console.error('Fare calculation error:', error);
      Alert.alert('Error', 'Could not calculate fare. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmRide = async () => {
    if (!user) return;
    
    setStep('tracking');
    setRideStatus('searching');
    lastNotifiedStatusRef.current = 'searching';

    try {
      const rideId = await createRide({
        riderId: user.uid,
        riderEmail: user.email,
        pickupAddress: pickupAddress,
        destinationAddress: selectedDestination,
        pickupLocation: currentLocation,
        destinationLocation: destinationCoords,
        estimatedFare: estimatedFare,
        actualDistanceKm: rideDistance,
        estimatedDuration: rideDuration,
        distanceKm: rideDistance,
        status: 'searching'
      });
      
      setCurrentRideId(rideId);
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(doc(db, 'rides', rideId), (docSnap) => {
        if (!docSnap.exists()) return;

        const rideData = { id: docSnap.id, ...docSnap.data() };
        const newStatus = rideData.status;

        if (newStatus === lastNotifiedStatusRef.current) return;

        lastNotifiedStatusRef.current = newStatus;
        setRideStatus(newStatus);

        switch (newStatus) {
          case 'accepted':
            Alert.alert('Driver Found', `${rideData.driverName || 'Driver'} has accepted your ride`);
            break;
          case 'arrived':
            Alert.alert('Driver Arrived', 'Your driver is waiting for you');
            break;
          case 'started':
            Alert.alert('Ride Started', 'You are on your way');
            break;
          case 'completed':
            Alert.alert('Ride Complete', `Thank you for riding!\n\nPay ₦${rideData.estimatedFare} in cash`);
            setTimeout(() => {
              setStep('pickup');
              setSelectedDestination(null);
              setDestinationCoords(null);
              setEstimatedFare(null);
              setRideDistance(null);
              setRideDuration(null);
              setCurrentRideId(null);
              setRideStatus(null);
              lastNotifiedStatusRef.current = null;
              unsubscribe();
            }, 3000);
            break;
          case 'cancelled':
            Alert.alert('Ride Cancelled', 'The ride was cancelled');
            setStep('pickup');
            setRideStatus(null);
            lastNotifiedStatusRef.current = null;
            unsubscribe();
            break;
        }
      });
      
      setUnsubscribeRide(() => unsubscribe);
      
    } catch (error) {
      Alert.alert('Error', 'Could not create ride. Please try again.');
      setStep('pickup');
      setRideStatus(null);
    }
  };

  const handleCancelRide = () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          onPress: async () => {
            if (unsubscribeRide) {
              unsubscribeRide();
              setUnsubscribeRide(null);
            }
            if (currentRideId) {
              await updateRideStatus(currentRideId, 'cancelled', {
                cancelledBy: 'rider',
                cancelledAt: new Date().toISOString()
              });
            }
            setStep('pickup');
            setRideStatus(null);
            setCurrentRideId(null);
            lastNotifiedStatusRef.current = null;
            Alert.alert('Ride Cancelled');
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    await signOut(auth);
    setStep('pickup');
    setSelectedDestination(null);
    setDestinationCoords(null);
    setEstimatedFare(null);
  };

  // History Screen
  if (showHistory) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ride History</Text>
          <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.historyList}>
          {rideHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No rides yet</Text>
              <Text style={styles.emptyHistorySubtext}>Your ride history will appear here</Text>
            </View>
          ) : (
            rideHistory.map((ride) => (
              <View key={ride.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDate}>
                    {new Date(ride.createdAt).toLocaleDateString()}
                  </Text>
                  <View style={[styles.historyStatus, 
                    { backgroundColor: ride.status === 'completed' ? '#4CAF50' : '#FFA500' }]}>
                    <Text style={styles.historyStatusText}>{ride.status}</Text>
                  </View>
                </View>
                <Text style={styles.historyPickup}>From: {ride.pickupAddress}</Text>
                <Text style={styles.historyDest}>To: {ride.destinationAddress}</Text>
                <Text style={styles.historyFare}>₦{ride.estimatedFare}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  // Pickup Screen
  if (step === 'pickup') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>RidaAuchi</Text>
          <Text style={styles.headerSubtitle}>Welcome, {user?.email}</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.label}>📍 Pickup Location</Text>
            <Text style={styles.address}>{pickupAddress}</Text>
            
            <View style={styles.divider} />
            
            <Text style={styles.label}>🎯 Select Destination</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.destinationScroll}>
              {AUCHI_DESTINATIONS.map((dest) => (
                <TouchableOpacity
                  key={dest.name}
                  style={[
                    styles.destinationChip,
                    selectedDestination === dest.name && styles.destinationChipActive
                  ]}
                  onPress={() => {
                    setSelectedDestination(dest.name);
                    setDestinationCoords({ lat: dest.lat, lng: dest.lng });
                  }}
                >
                  <Text style={[
                    styles.destinationChipText,
                    selectedDestination === dest.name && styles.destinationChipTextActive
                  ]}>
                    {dest.name}
                  </Text>
                  <Text style={styles.destinationDescription}>{dest.description}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {selectedDestination && (
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={handleRequestRide}>
                <Text style={styles.primaryButtonText}>Request Ride to {selectedDestination}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.historyButton}
              onPress={loadRideHistory}>
              <Text style={styles.historyButtonText}>View Ride History</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Confirm Fare Screen
  if (step === 'confirm') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ride Details</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>From</Text>
          <Text style={styles.address}>{pickupAddress}</Text>
          
          <Text style={styles.label}>To</Text>
          <Text style={styles.address}>{selectedDestination}</Text>
          
          {rideDistance && (
            <View style={styles.distanceBox}>
              <Text style={styles.distanceText}>📏 Distance: {rideDistance} km</Text>
              <Text style={styles.durationText}>⏱️ Est. time: {rideDuration} minutes</Text>
            </View>
          )}
          
          <View style={styles.fareBox}>
            <Text style={styles.fareLabel}>Estimated Fare</Text>
            <Text style={styles.fareAmount}>₦{estimatedFare}</Text>
            <Text style={styles.fareNote}>Cash payment to driver</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleConfirmRide}>
            <Text style={styles.primaryButtonText}>Confirm Ride</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => setStep('pickup')}>
            <Text style={styles.secondaryButtonText}>Change Destination</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Tracking Screen
  if (step === 'tracking') {
    const getStatusMessage = () => {
      switch(rideStatus) {
        case 'searching': return 'Finding a driver near you...';
        case 'accepted': return 'Driver assigned. They are on the way.';
        case 'arrived': return 'Driver has arrived at your location.';
        case 'started': return 'En route to your destination.';
        case 'completed': return 'Ride completed!';
        default: return 'Processing...';
      }
    };

    const getStatusColor = () => {
      switch(rideStatus) {
        case 'searching': return '#FFA500';
        case 'accepted': return '#2196F3';
        case 'arrived': return '#4CAF50';
        case 'started': return '#F04E05';
        case 'completed': return '#4CAF50';
        default: return '#666';
      }
    };

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Ride</Text>
        </View>

        <View style={styles.trackingCard}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusMessage}>{getStatusMessage()}</Text>
          
          <View style={styles.routeInfo}>
            <View style={styles.routePoint}>
              <View style={styles.routeDotPickup} />
              <Text style={styles.routeText}>{pickupAddress}</Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routePoint}>
              <View style={styles.routeDotDest} />
              <Text style={styles.routeText}>{selectedDestination}</Text>
            </View>
          </View>

          {rideStatus !== 'completed' && rideStatus !== 'cancelled' && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancelRide}>
              <Text style={styles.cancelButtonText}>Cancel Ride</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return null;
}

// ============ MAIN APP WITH AUTH ============

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsAuthenticated(!!user);
      setCheckingAuth(false);

      if (user) {
        setLoadingProfile(true);
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
        setLoadingProfile(false);
      } else {
        setUserProfile(null);
        setLoadingProfile(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUserProfile(null);
    setIsAuthenticated(false);
  };

  if (!appIsReady) {
    return null;
  }

  if (checkingAuth || (isAuthenticated && loadingProfile)) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#F04E05" />
        <Text style={{ marginTop: 20 }}>Loading...</Text>
      </View>
    );
  }

  if (isAuthenticated) {
    const role = userProfile?.role;

    if (role === 'driver') {
      if (!userProfile?.isApproved) {
        return <PendingApprovalScreen onLogout={handleLogout} />;
      }
      return <DriverApp />;
    }

    if (role === 'rider') {
      return <RideApp />;
    }

    return (
      <View style={styles.centerContainer}>
        <View style={styles.pendingCard}>
          <Text style={styles.pendingTitle}>Profile Not Found</Text>
          <Text style={styles.pendingText}>
            Your account is missing a role. Please contact support or sign up again.
          </Text>
          <TouchableOpacity style={styles.authButton} onPress={handleLogout}>
            <Text style={styles.authButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showLogin) {
    return (
      <LoginScreen
        onLogin={() => setIsAuthenticated(true)}
        onSwitchToRegister={() => setShowLogin(false)}
      />
    );
  }

  return (
    <RegisterScreen
      onRegister={() => setIsAuthenticated(true)}
      onSwitchToLogin={() => setShowLogin(true)}
    />
  );
}

// ============ STYLES ==========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#F04E05',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  logoutButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: {
    color: 'white',
    fontSize: 14,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
  },
  card: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  trackingCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  address: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 20,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 20,
  },
  destinationScroll: {
    flexDirection: 'row',
    marginVertical: 15,
    maxHeight: 100,
  },
  destinationChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 100,
    alignItems: 'center',
  },
  destinationChipActive: {
    backgroundColor: '#F04E05',
    borderColor: '#F04E05',
  },
  destinationChipText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  destinationChipTextActive: {
    color: 'white',
  },
  destinationDescription: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: '#F04E05',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#F04E05',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fareBox: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 15,
  },
  fareLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  fareAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F04E05',
  },
  fareNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  distanceBox: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 10,
    marginVertical: 10,
  },
  distanceText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  durationText: {
    fontSize: 14,
    color: '#666',
  },
  statusIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 15,
  },
  statusMessage: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  routeInfo: {
    width: '100%',
    marginTop: 10,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  routeDotPickup: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F04E05',
    marginRight: 12,
  },
  routeDotDest: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    marginRight: 12,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#ddd',
    marginLeft: 5,
    marginVertical: 5,
  },
  routeText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  historyButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  historyButtonText: {
    color: '#F04E05',
    fontSize: 14,
    fontWeight: '600',
  },
  historyList: {
    flex: 1,
    padding: 20,
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  historyStatusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  historyPickup: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  historyDest: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  historyFare: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F04E05',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyHistoryText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#999',
  },
  
  // Auth Styles
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  authCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F04E05',
    textAlign: 'center',
    marginBottom: 10,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  authInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  authButton: {
    backgroundColor: '#F04E05',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authLink: {
    color: '#F04E05',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  authHint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  roleToggle: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  roleOptionActive: {
    backgroundColor: '#F04E05',
    borderColor: '#F04E05',
  },
  roleOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  roleOptionTextActive: {
    color: 'white',
  },
  driverNote: {
    fontSize: 12,
    color: '#999',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 18,
  },
  pendingCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
  },
  pendingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F04E05',
    marginBottom: 12,
    textAlign: 'center',
  },
  pendingText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  onlineCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  onlineLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  onlineButton: {
    backgroundColor: '#ccc',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  onlineButtonActive: {
    backgroundColor: '#4CAF50',
  },
  onlineButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshText: {
    color: '#F04E05',
    fontSize: 14,
  },
  ridesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  rideCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  ridePickup: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  rideDest: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rideFare: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F04E05',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyRides: {
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyRidesText: {
    fontSize: 16,
    color: '#666',
  },
  emptyRidesSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  activeRideCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 15,
  },
  buttonGroup: {
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#F04E05',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  historyMainButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  historyMainButtonText: {
    color: '#F04E05',
    fontWeight: '600',
  },
  driverHistoryStatus: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 5,
  },
});