import { useState, useEffect, useCallback, useRef } from 'react';
import type { Campus } from '../types';

export interface LocationState {
  status: 'detecting' | 'live' | 'error' | 'permission_denied';
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  locationName: string;
  campus: Campus;
  distanceKm: number | null;
  lastUpdated: Date | null;
  errorMsg: string | null;
}

// Koordinat UIN Antasari
const CAMPUS_1_BJM = { lat: -3.3168, lng: 114.5901, name: 'Kampus 1 Banjarmasin' };
const CAMPUS_2_BJB = { lat: -3.4478, lng: 114.8322, name: 'Kampus 2 Banjarbaru' };

// Haversine formula untuk menghitung jarak akurat dalam KM
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius bumi dalam KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function useRealtimeLocation(
  currentCampus: Campus,
  onCampusChange?: (newCampus: Campus) => void
) {
  const [location, setLocation] = useState<LocationState>({
    status: 'detecting',
    latitude: null,
    longitude: null,
    accuracy: null,
    locationName: 'Mendeteksi GPS...',
    campus: currentCampus,
    distanceKm: null,
    lastUpdated: null,
    errorMsg: null,
  });

  const watchIdRef = useRef<number | null>(null);

  // Reverse geocode menggunakan OpenStreetMap Nominatim atau fallback cerdas
  const reverseGeocode = async (lat: number, lon: number, dist1: number, dist2: number) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'id,en',
            'User-Agent': 'AntasariMart-CampusHub/1.0',
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const road = addr.road || addr.street || addr.neighbourhood || addr.suburb || '';
        const city = addr.city || addr.town || addr.county || addr.city_district || '';

        // Tentukan kampus terdekat
        const nearestCampus = dist2 < dist1 ? 'banjarbaru' : 'banjarmasin';
        const campusLabel = nearestCampus === 'banjarbaru' ? 'Kampus 2 Banjarbaru' : 'Kampus 1 Banjarmasin';
        const distMin = Math.min(dist1, dist2);

        let finalName = '';
        if (distMin <= 1.5) {
          finalName = `${campusLabel} (Di Lokasi)`;
        } else if (road && city) {
          finalName = `${road}, ${city}`;
        } else if (road) {
          finalName = `${road} (${campusLabel})`;
        } else if (city) {
          finalName = `${city} (~${distMin} km dari ${campusLabel})`;
        } else {
          finalName = `${campusLabel} (~${distMin} km)`;
        }

        return {
          locationName: finalName,
          campus: nearestCampus as Campus,
        };
      }
    } catch (_err) {
      // Abaikan jika timeout / offline
    }

    // Fallback jika API reverse geocoding tidak merespon
    const nearestCampus = dist2 < dist1 ? 'banjarbaru' : 'banjarmasin';
    const campusLabel = nearestCampus === 'banjarbaru' ? 'Kampus 2 Banjarbaru' : 'Kampus 1 Banjarmasin';
    const distMin = Math.min(dist1, dist2);

    return {
      locationName: distMin <= 1.5 ? `${campusLabel} (Di Lokasi)` : `${campusLabel} (~${distMin} km)`,
      campus: nearestCampus as Campus,
    };
  };

  const handlePosition = useCallback(
    async (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;

      const dist1 = calculateDistanceKm(latitude, longitude, CAMPUS_1_BJM.lat, CAMPUS_1_BJM.lng);
      const dist2 = calculateDistanceKm(latitude, longitude, CAMPUS_2_BJB.lat, CAMPUS_2_BJB.lng);

      const minDistance = Math.min(dist1, dist2);

      const geocoded = await reverseGeocode(latitude, longitude, dist1, dist2);

      setLocation({
        status: 'live',
        latitude,
        longitude,
        accuracy: Math.round(accuracy),
        locationName: geocoded.locationName,
        campus: geocoded.campus,
        distanceKm: minDistance,
        lastUpdated: new Date(),
        errorMsg: null,
      });

      if (onCampusChange && geocoded.campus !== currentCampus) {
        onCampusChange(geocoded.campus);
      }
    },
    [currentCampus, onCampusChange]
  );

  const handleError = useCallback(
    (err: GeolocationPositionError) => {
      console.warn('Geolocation error:', err.message);
      const fallbackName = currentCampus === 'banjarbaru' ? 'Kampus 2 Banjarbaru' : 'Kampus 1 Banjarmasin';

      setLocation((prev) => ({
        ...prev,
        status: err.code === 1 ? 'permission_denied' : 'live',
        locationName: fallbackName,
        errorMsg: err.message,
        lastUpdated: new Date(),
      }));
    },
    [currentCampus]
  );

  const refreshLocation = useCallback(() => {
    setLocation((prev) => ({
      ...prev,
      status: 'detecting',
      locationName: 'Mencari sinyal GPS...',
    }));

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(handlePosition, handleError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000,
      });
    } else {
      setLocation((prev) => ({
        ...prev,
        status: 'live',
        locationName: currentCampus === 'banjarbaru' ? 'Kampus 2 Banjarbaru' : 'Kampus 1 Banjarmasin',
      }));
    }
  }, [handlePosition, handleError, currentCampus]);

  useEffect(() => {
    refreshLocation();

    // Jalankan watchPosition agar update live saat pengguna bergerak
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      });
    }

    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [refreshLocation, handlePosition, handleError]);

  return {
    ...location,
    refreshLocation,
  };
}
