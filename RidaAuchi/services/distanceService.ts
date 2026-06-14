import axios from 'axios';
import Constants from 'expo-constants';
import * as Location from 'expo-location';

const ORS_API_KEY = Constants.expoConfig?.extra?.openRouteService?.apiKey ?? '';
const ORS_BASE_URL = 'https://api.openrouteservice.org/v2';

if (!ORS_API_KEY) {
  console.warn('OpenRouteService API key is missing. Set ORS_API_KEY in .env and make sure app.config.js exports it.');
}

/** Build display-friendly address from whichever components are available */
const buildFriendlyAddress = (
  houseNumber: string,
  street: string,
  area: string,
  city: string
): string | null => {
  const streetPart = [houseNumber, street].filter(Boolean).join(' ');
  const parts = [streetPart, area, city].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
};

export const reverseGeocodeCoords = async (
  latitude: number,
  longitude: number
): Promise<string> => {

  // ── 1. Nominatim (OpenStreetMap) — free, no API key ───────────────────────
  try {
    const response = await axios.get(
      'https://nominatim.openstreetmap.org/reverse',
      {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'jsonv2',
          addressdetails: 2,
        },
        headers: {
          'User-Agent': 'RidaAuchi/1.0 (ridaauchi@expo.app)',
          'Accept-Language': 'en',
        },
        timeout: 8000,
      }
    );

    const data = response.data;
    const addr = data?.address;

    if (addr) {
      const houseNumber = addr.house_number ?? '';
      const road = addr.road ?? addr.pedestrian ?? addr.footway ?? addr.street ?? '';
      const suburb = addr.suburb ?? addr.neighbourhood ?? addr.quarter ?? addr.village ?? '';
      const city = addr.city ?? addr.town ?? addr.county ?? addr.state ?? '';

      // If we have a road name or house number, build from components directly
      if (houseNumber || road) {
        const result = buildFriendlyAddress(houseNumber, road, suburb, city);
        if (result) return result;
      }

      // If OSM has no street data for this area (common in Auchi),
      // use display_name which often has more info
      if (data.display_name) {
        const parts = data.display_name.split(',').map((s: string) => s.trim());
        const truncated = parts.slice(0, Math.min(3, parts.length)).join(', ');
        if (truncated) return truncated;
      }
    }
  } catch (e) {
    console.warn('Nominatim failed, trying Photon:', e);
  }

  // ── 2. Photon (Komoot) — free, no API key ────────────────────────────────
  try {
    const response = await axios.get(
      'https://photon.komoot.io/reverse',
      {
        params: { lat: latitude, lon: longitude, limit: 1, lang: 'en' },
        timeout: 6000,
      }
    );

    const features = response.data?.features;
    if (features && features.length > 0) {
      const p = features[0].properties;
      const houseNumber = p.housenumber ?? p.street_number ?? '';
      const street = p.street ?? p.road ?? p.path ?? p.name ?? '';
      const area = p.suburb ?? p.district ?? p.neighbourhood ?? p.borough ?? '';
      const city = p.city ?? p.town ?? p.village ?? p.county ?? p.state ?? p.country ?? '';

      if (houseNumber || street) {
        const result = buildFriendlyAddress(houseNumber, street, area, city);
        if (result) return result;
      }
      if (city) return city;
    }
  } catch (e) {
    console.warn('Photon failed, trying ORS:', e);
  }

  // ── 3. OpenRouteService (fallback) ──────────────────────────────────────
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
    console.warn('ORS failed, trying Expo geocoder:', e);
  }

  // ── 4. Expo built-in (last resort) ──────────────────────────────────────
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results.length > 0) {
      const g = results[0];
      const parts = [g.streetNumber, g.street, g.district, g.city].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
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
}

// Fixed fare for all rides in Auchi
const FIXED_FARE = 7000; // ₦7,000

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
        geometry: false
      },
      {
        headers: {
          'Authorization': ORS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const distanceMeters = response.data.features[0].properties.segments[0].distance;
    const durationSeconds = response.data.features[0].properties.segments[0].duration;
    
    const distanceKm = distanceMeters / 1000;
    const durationMinutes = Math.ceil(durationSeconds / 60);
    
    return {
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      durationMinutes,
      fare: FIXED_FARE, // Fixed ₦7,000
    };
    
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error('OpenRouteService error status:', error.response.status);
      console.error('OpenRouteService response data:', error.response.data);
    } else {
      console.error('OpenRouteService error:', error);
    }
    
    // Fallback: straight-line estimate
    const estimatedDistance = estimateDistance(pickup, destination);
    
    return {
      distanceKm: estimatedDistance,
      durationMinutes: Math.ceil(estimatedDistance * 2),
      fare: FIXED_FARE, // Still ₦7,000
    };
  }
};

// Haversine formula for straight-line distance
const estimateDistance = (pickup: Coordinates, destination: Coordinates): number => {
  const R = 6371;
  const dLat = (destination.lat - pickup.lat) * Math.PI / 180;
  const dLon = (destination.lng - pickup.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(pickup.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};