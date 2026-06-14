import axios from 'axios';
import Constants from 'expo-constants';
import * as Location from 'expo-location';

const ORS_API_KEY = Constants.expoConfig?.extra?.openRouteService?.apiKey ?? '';
const ORS_BASE_URL = 'https://api.openrouteservice.org/v2';

if (!ORS_API_KEY) {
  console.warn('OpenRouteService API key is missing. Set ORS_API_KEY in .env and make sure app.config.js exports it.');
}

/**
 * Reverse geocode coordinates to a human-readable address.
 *
 * Priority order:
 *  1. Nominatim (OpenStreetMap) — free, no API key, returns house_number
 *  2. OpenRouteService — free tier, already in project
 *  3. Expo built-in — device OS geocoder, last resort
 */
export const reverseGeocodeCoords = async (
  latitude: number,
  longitude: number
): Promise<string> => {

  // ── 1. Nominatim (OpenStreetMap) ────────────────────────────────────────
  try {
    const response = await axios.get(
      'https://nominatim.openstreetmap.org/reverse',
      {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'jsonv2',
          addressdetails: 1,
        },
        headers: {
          // Required by Nominatim usage policy
          'User-Agent': 'RidaAuchi/1.0 (ridaauchi@expo.app)',
          'Accept-Language': 'en',
        },
        timeout: 6000,
      }
    );

    const addr = response.data?.address;
    if (addr) {
      // Build the most specific address possible
      const houseNumber = addr.house_number ?? '';
      const road       = addr.road ?? addr.pedestrian ?? addr.footway ?? '';
      const suburb     = addr.suburb ?? addr.neighbourhood ?? addr.quarter ?? '';
      const city       = addr.city ?? addr.town ?? addr.village ?? addr.county ?? '';

      // Format: "12 Federal Poly Road, Auchi" or "Federal Poly Road, Auchi"
      const streetLine = [houseNumber, road].filter(Boolean).join(' ');
      const parts = [streetLine, suburb, city].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
  } catch (e) {
    console.warn('Nominatim reverse geocode failed, trying ORS:', e);
  }

  // ── 2. OpenRouteService (fallback) ──────────────────────────────────────
  try {
    const response = await axios.get(
      'https://api.openrouteservice.org/geocode/reverse',
      {
        params: {
          'api_key': ORS_API_KEY,
          'point.lon': longitude,
          'point.lat': latitude,
          'size': 1,
        },
        timeout: 6000,
      }
    );
    const features = response.data?.features;
    if (features && features.length > 0) {
      const props = features[0].properties;
      const parts = [
        props.housenumber ? `${props.housenumber} ` : '',
        props.street,
        props.neighbourhood,
        props.locality || props.county,
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
  } catch (e) {
    console.warn('ORS reverse geocode failed, trying Expo geocoder:', e);
  }

  // ── 3. Expo built-in (last resort) ──────────────────────────────────────
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results.length > 0) {
      const geo = results[0];
      const parts = [geo.streetNumber, geo.street, geo.district, geo.city].filter(Boolean);
      return parts.join(', ') || 'Your current location';
    }
  } catch (e) {
    console.warn('Expo reverse geocode also failed:', e);
  }

  return 'Your current location';
};



export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DistanceResult {
  distanceKm: number;
  durationMinutes: number;
  fare: number;
  polyline?: string; // For map routing (optional)
}

// Fare constants (adjust for Auchi market)
const BASE_FARE = 200; // ₦200
const PER_KM_RATE = 100; // ₦100 per km
const MIN_FARE = 300; // Minimum fare ₦300

export const calculateDistanceAndFare = async (
  pickup: Coordinates,
  destination: Coordinates
): Promise<DistanceResult> => {
  try {
    // OpenRouteService expects [longitude, latitude] format
    const start = [pickup.lng, pickup.lat];
    const end = [destination.lng, destination.lat];
    
    const response = await axios.post(
      `${ORS_BASE_URL}/directions/driving-car/geojson`,
      {
        coordinates: [start, end],
        units: 'km',
        geometry: true // GeoJSON requires geometry; keep true to satisfy format
      },
      {
        headers: {
          'Authorization': ORS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Extract distance and duration
    const distanceMeters = response.data.features[0].properties.segments[0].distance;
    const durationSeconds = response.data.features[0].properties.segments[0].duration;
    
    const distanceKm = distanceMeters / 1000;
    const durationMinutes = Math.ceil(durationSeconds / 60);
    
    // Calculate fare
    let fare = BASE_FARE + (distanceKm * PER_KM_RATE);
    fare = Math.max(fare, MIN_FARE); // Ensure minimum fare
    fare = Math.round(fare); // Round to nearest naira
    
    return {
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      durationMinutes,
      fare
    };
    
  } catch (error) {
    // Log detailed response when available to aid debugging (400/401/403 etc.)
    if (axios.isAxiosError(error) && error.response) {
      console.error('OpenRouteService error status:', error.response.status);
      console.error('OpenRouteService response data:', error.response.data);
    } else {
      console.error('OpenRouteService error:', error);
    }
    
    // Fallback calculation (for when API fails)
    // Estimate based on straight-line distance
    const estimatedDistance = estimateDistance(pickup, destination);
    let fallbackFare = BASE_FARE + (estimatedDistance * PER_KM_RATE);
    fallbackFare = Math.max(fallbackFare, MIN_FARE);
    
    return {
      distanceKm: estimatedDistance,
      durationMinutes: Math.ceil(estimatedDistance * 2), // Assume 2 min per km
      fare: Math.round(fallbackFare)
    };
  }
};

// Fallback: Haversine formula for straight-line distance
const estimateDistance = (pickup: Coordinates, destination: Coordinates): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (destination.lat - pickup.lat) * Math.PI / 180;
  const dLon = (destination.lng - pickup.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(pickup.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

// Cache results to reduce API calls (optional)
const distanceCache = new Map();

export const getCachedDistance = async (
  pickup: Coordinates,
  destination: Coordinates
): Promise<DistanceResult> => {
  const cacheKey = `${pickup.lat},${pickup.lng}-${destination.lat},${destination.lng}`;
  
  if (distanceCache.has(cacheKey)) {
    return distanceCache.get(cacheKey);
  }
  
  const result = await calculateDistanceAndFare(pickup, destination);
  distanceCache.set(cacheKey, result);
  
  // Clear cache after 10 minutes (optional)
  setTimeout(() => distanceCache.delete(cacheKey), 10 * 60 * 1000);
  
  return result;
};