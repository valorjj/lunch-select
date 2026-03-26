import { useState, useCallback } from 'react';
import { DEFAULT_OFFICE } from '../config/defaults';

export interface SavedLocation {
  lat: number;
  lng: number;
  name: string;
}

const LOCATION_KEY = 'lunch-select-company-location';
const SAVED_LOCATIONS_KEY = 'lunch-select-saved-locations';

function loadLocation(): SavedLocation {
  try {
    const saved = localStorage.getItem(LOCATION_KEY);
    return saved ? JSON.parse(saved) : { lat: DEFAULT_OFFICE.lat, lng: DEFAULT_OFFICE.lng, name: DEFAULT_OFFICE.name };
  } catch {
    return { lat: DEFAULT_OFFICE.lat, lng: DEFAULT_OFFICE.lng, name: DEFAULT_OFFICE.name };
  }
}

function loadSavedLocations(): SavedLocation[] {
  try {
    const saved = localStorage.getItem(SAVED_LOCATIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function useCompanyLocation() {
  const [location, setLocation] = useState<SavedLocation>(loadLocation);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(loadSavedLocations);

  const updateLocation = useCallback((loc: SavedLocation) => {
    setLocation(loc);
    try {
      localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
    } catch { /* ignore */ }
  }, []);

  const addSavedLocation = useCallback((loc: SavedLocation) => {
    setSavedLocations((prev) => {
      if (prev.some((l) => l.name === loc.name)) return prev;
      const next = [...prev, loc];
      try {
        localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const removeSavedLocation = useCallback((name: string) => {
    setSavedLocations((prev) => {
      const next = prev.filter((l) => l.name !== name);
      try {
        localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { location, updateLocation, savedLocations, addSavedLocation, removeSavedLocation };
}
