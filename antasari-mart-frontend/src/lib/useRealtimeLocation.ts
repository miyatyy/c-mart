import { useState, useEffect, useCallback, useRef } from 'react';
import type { Campus } from '../types';

export interface LocationState {
  status: 'detecting' | 'live' | 'error' | 'permission_denied';
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  locationName: string;
  cityName: string; // ✨ 1 kata nama kota (misal: Banjarmasin / Banjarbaru / Martapura)
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

// 🏷️ Ekstraksi 1 Kata Nama Kota Saja (misal: Banjarmasin, Banjarbaru, Martapura)
function extractSingleWordCity(rawCity: string, nearestCampus: Campus): string {
  if (!rawCity || !rawCity.trim()) {
    return nearestCampus === 'banjarbaru' ? 'Banjarbaru' : 'Banjarmasin';
  }

  const clean = rawCity
    .replace(/Kota\s+/gi, '')
    .replace(/Kabupaten\s+/gi, '')
    .replace(/Kecamatan\s+/gi, '')
    .replace(/Kelurahan\s+/gi, '')
    .trim();

  const words = clean.split(/[\s,.-]+/);
  let word = words[0] || '';

  // Khusus penamaan gabungan 2 kata Banjar Baru -> Banjarbaru
  if (words.length >= 2 && words[0].toLowerCase() === 'banjar' && words[1].toLowerCase() === 'baru') {
    word = 'Banjarbaru';
  } else if (words.length >= 2 && words[0].toLowerCase() === 'tanah' && words[1].toLowerCase() === 'bumbu') {
    word = 'Batulicin';
  } else if (words.length >= 2 && words[0].toLowerCase() === 'tanah' && words[1].toLowerCase() === 'laut') {
    word = 'Pelaihari';
  } else if (words.length >= 2 && words[0].toLowerCase() === 'hulu' && words[1].toLowerCase() === 'sungai') {
    word = words[2] || 'Kandangan';
  }

  if (!word || word.length < 3) {
    return nearestCampus === 'banjarbaru' ? 'Banjarbaru' : 'Banjarmasin';
  }

  return word.charAt(0).toUpperCase() + word.slice(1);
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
    locationName: 'Mencari...',
    cityName: currentCampus === 'banjarbaru' ? 'Banjarbaru' : 'Banjarmasin',
    campus: currentCampus,
    distanceKm: null,
    lastUpdated: null,
    errorMsg: null,
  });

  const watchIdRef = useRef<number | null>(null);

  // 📡 Reverse Geocode Cepat CORS-Friendly
  const reverseGeocode = async (lat: number, lon: number, dist1: number, dist2: number) => {
    const nearestCampus: Campus = dist2 < dist1 ? 'banjarbaru' : 'banjarmasin';
    const defaultCity = nearestCampus === 'banjarbaru' ? 'Banjarbaru' : 'Banjarmasin';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const rawCity = data.city || data.locality || (data.localityInfo?.administrative && data.localityInfo.administrative[2]?.name) || '';
        const singleWordCity = extractSingleWordCity(rawCity, nearestCampus);

        // 🛰️ Webhook Sinkronisasi Real-Time Otomatis
        try {
          fetch('/api/location/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: lat,
              longitude: lon,
              cityName: singleWordCity,
              campus: nearestCampus,
              timestamp: new Date().toISOString()
            })
          }).catch(() => {});
        } catch (_) {}

        return {
          locationName: singleWordCity,
          cityName: singleWordCity,
          campus: nearestCampus,
        };
      }
    } catch (_err) {
      // Offline fallback
    }

    return {
      locationName: defaultCity,
      cityName: defaultCity,
      campus: nearestCampus,
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
        locationName: geocoded.cityName,
        cityName: geocoded.cityName,
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
      const fallbackCity = currentCampus === 'banjarbaru' ? 'Banjarbaru' : 'Banjarmasin';

      setLocation((prev) => ({
        ...prev,
        status: err.code === 1 ? 'permission_denied' : 'live',
        locationName: fallbackCity,
        cityName: fallbackCity,
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
