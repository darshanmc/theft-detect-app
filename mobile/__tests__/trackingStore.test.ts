import { useTrackingStore } from '../src/state/trackingStore';
import type { DeviceLocation } from '../src/api/types';

const loc = (lat: number, lng: number): DeviceLocation => ({
  deviceId: 'car-001',
  lat,
  lng,
  headingDeg: 90,
  speedKmh: 42,
  updatedAt: new Date().toISOString(),
});

beforeEach(() =>
  useTrackingStore.setState({
    mode: 'normal',
    lastLocation: null,
    trail: [],
    lastError: null,
    hydrated: false,
  }),
);

describe('trackingStore', () => {
  it('updates last location without building a trail in normal mode', () => {
    useTrackingStore.getState().setLocation(loc(1, 1));
    useTrackingStore.getState().setLocation(loc(2, 2));

    const s = useTrackingStore.getState();
    expect(s.lastLocation?.lat).toBe(2);
    expect(s.trail).toHaveLength(0);
  });

  it('builds a breadcrumb trail in theft mode', () => {
    useTrackingStore.getState().setMode('theft');
    useTrackingStore.getState().setLocation(loc(1, 1));
    useTrackingStore.getState().setLocation(loc(2, 2));

    expect(useTrackingStore.getState().trail).toEqual([
      { latitude: 1, longitude: 1 },
      { latitude: 2, longitude: 2 },
    ]);
  });

  it('resetTrail clears the breadcrumb trail', () => {
    useTrackingStore.getState().setMode('theft');
    useTrackingStore.getState().setLocation(loc(1, 1));
    useTrackingStore.getState().resetTrail();

    expect(useTrackingStore.getState().trail).toHaveLength(0);
  });

  it('setLocation clears a previous error', () => {
    useTrackingStore.getState().setError('boom');
    useTrackingStore.getState().setLocation(loc(1, 1));

    expect(useTrackingStore.getState().lastError).toBeNull();
  });
});
