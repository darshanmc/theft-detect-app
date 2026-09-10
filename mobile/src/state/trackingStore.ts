import { create } from 'zustand';
import type { DeviceLocation } from '../api/types';

export type TrackingMode = 'normal' | 'theft';

export interface MapPoint {
  latitude: number;
  longitude: number;
}

/** Cap the breadcrumb trail so memory stays bounded in long theft sessions. */
const MAX_TRAIL_POINTS = 500;

interface TrackingState {
  mode: TrackingMode;
  lastLocation: DeviceLocation | null;
  /** Breadcrumb trail collected while theft mode is active. */
  trail: MapPoint[];
  lastError: string | null;
  /** True once the persisted mode has been restored from storage. */
  hydrated: boolean;
  setMode: (mode: TrackingMode) => void;
  setLocation: (loc: DeviceLocation) => void;
  setError: (message: string | null) => void;
  setHydrated: (hydrated: boolean) => void;
  resetTrail: () => void;
}

export const useTrackingStore = create<TrackingState>((set, get) => ({
  mode: 'normal',
  lastLocation: null,
  trail: [],
  lastError: null,
  hydrated: false,

  setMode: (mode) => set({ mode }),

  setLocation: (loc) => {
    const { mode, trail } = get();
    set({
      lastLocation: loc,
      lastError: null,
      trail:
        mode === 'theft'
          ? [...trail, { latitude: loc.lat, longitude: loc.lng }].slice(-MAX_TRAIL_POINTS)
          : trail,
    });
  },

  setError: (message) => set({ lastError: message }),
  setHydrated: (hydrated) => set({ hydrated }),
  resetTrail: () => set({ trail: [] }),
}));
