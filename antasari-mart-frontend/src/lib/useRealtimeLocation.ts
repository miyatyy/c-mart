import { useState, useEffect, useCallback, useRef } from 'react';
import type { Campus } from '../types';

export interface LocationState {
  status: 'detecting' | 'live' | 'error' | 'permission_denied';
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  locationName: string;
  cityName: string;
  campus: Campus;
  distanceKm: number | null;
  lastUpdated: Date | null;
  errorMsg: string | null;
}

// Koordinat UIN Antasari
const CAMPUS_1_BJM = { lat: -3.3168, lng: 114.5901, name: 'Banjarmasin' };
const CAMPUS_2_BJB = { lat: -3.4478, lng: 114.8322, name: 'Banjarbaru' };

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
  const defaultCity = currentCampus === 'banjarbaru' ? 'Banjarbaru' : 'Banjarmasin';

  const [location, setLocation] = useState<LocationState>({
    status: 'live',
    latitude: null,
    longitude: null,
    accuracy: null,
    locationName: defaultCity,
    cityName: defaultCity,
    campus: currentCampus,
    distanceKm: null,
    lastUpdated: null,
    errorMsg: null,
  });

  const onCampusChangeRef = useRef(onCampusChange);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    onCampusChangeRef.current = onCampusChange;
  }, [onCampusChange]);

  const refreshLocation = useCallback(() => {
    if (isFetchingRef.current) return;
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      return;
    }

    isFetchingRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        isFetchingRef.current = false;
        const { latitude, longitude, accuracy } = pos.coords;
        const dist1 = calculateDistanceKm(latitude, longitude, CAMPUS_1_BJM.lat, CAMPUS_1_BJM.lng);
        const dist2 = calculateDistanceKm(latitude, longitude, CAMPUS_2_BJB.lat, CAMPUS_2_BJB.lng);
        const nearestCampus: Campus = dist2 < dist1 ? 'banjarbaru' : 'banjarmasin';
        const cityName = nearestCampus === 'banjarbaru' ? 'Banjarbaru' : 'Banjarmasin';
        const minDistance = Math.min(dist1, dist2);

        setLocation({
          status: 'live',
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          locationName: cityName,
          cityName: cityName,
          campus: nearestCampus,
          distanceKm: minDistance,
          lastUpdated: new Date(),
          errorMsg: null,
        });

        if (onCampusChangeRef.current && nearestCampus !== currentCampus) {
          onCampusChangeRef.current(nearestCampus);
        }
      },
      (_err) => {
        isFetchingRef.current = false;
        setLocation((prev) => ({
          ...prev,
          status: 'live',
          locationName: defaultCity,
          cityName: defaultCity,
          lastUpdated: new Date(),
        }));
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000, // 5 menit cache
      }
    );
  }, [currentCampus, defaultCity]);

  // Hanya jalankan 1 kali saat pertama kali mount
  useEffect(() => {
    refreshLocation();
  }, []);

  return {
    ...location,
    refreshLocation,
  };
}
