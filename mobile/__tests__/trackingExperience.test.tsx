import React from 'react';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import MapScreen from '../src/screens/MapScreen';
import { TrackingMap } from '../src/components/TrackingMap';
import { trackingService } from '../src/services/trackingService';
import { useTrackingStore } from '../src/state/trackingStore';
import type { DeviceLocation } from '../src/api/types';

jest.mock('../src/hooks/useTracking', () => ({
  useTracking: () => require('../src/state/trackingStore').useTrackingStore(),
}));
jest.mock('../src/components/DeviceSelectionModal', () => ({
  DeviceSelectionModal: () => null,
}));
jest.mock('../src/components/TrackingMap', () => ({ TrackingMap: () => null }));
jest.mock('../src/services/trackingService', () => ({
  trackingService: {
    deactivateTheft: jest.fn(),
    simulateTheftAlert: jest.fn(),
  },
}));

const location: DeviceLocation = {
  deviceId: 'car-001',
  lat: 37.77,
  lng: -122.41,
  headingDeg: 90,
  speedKmh: 24,
  updatedAt: '2026-09-16T10:00:00Z',
};
let renderer: ReactTestRenderer;
const originalDev = Object.getOwnPropertyDescriptor(globalThis, '__DEV__')!;
const text = () => JSON.stringify(renderer.toJSON());
const button = (label: string) =>
  renderer.root.findByProps({
    accessibilityRole: 'button',
    accessibilityLabel: label,
  });
const render = () =>
  act(() => {
    renderer = create(<MapScreen />);
  });

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-16T10:02:00Z'));
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  useTrackingStore.setState({
    mode: 'normal',
    deviceId: 'car-001',
    deviceModalVisible: false,
    lastLocation: location,
    trail: [],
    lastError: null,
    hydrated: true,
  });
});
afterEach(() => {
  act(() => renderer?.unmount());
  Object.defineProperty(globalThis, '__DEV__', originalDev);
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('presents vehicle, reading age and last reported speed instead of polling diagnostics', () => {
  render();
  expect(text()).toContain('My vehicle');
  expect(text()).toContain('car-001');
  expect(text()).toContain('Normal tracking');
  expect(text()).toContain('2 minutes ago');
  expect(text()).toContain('Last reported speed');
  expect(text()).not.toContain('polling every');
  act(() => button('Change vehicle tracker').props.onPress());
  expect(useTrackingStore.getState().deviceModalVisible).toBe(true);
});

it('distinguishes restoring, setup, waiting and failure without a fallback map', () => {
  useTrackingStore.setState({ lastLocation: null, hydrated: false });
  render();
  expect(text()).toContain('Getting things ready');
  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(1);
  act(() => useTrackingStore.setState({ hydrated: true, deviceId: null }));
  expect(text()).toContain('Your vehicle, in view');
  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(0);
  act(() => useTrackingStore.setState({ deviceId: 'car-001' }));
  expect(text()).toContain('Waiting for your vehicle');
  act(() =>
    useTrackingStore.setState({ lastError: 'HTTP 503 internal details' }),
  );
  expect(text()).toContain('Location unavailable');
  expect(text()).not.toContain('HTTP 503');
  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(0);
  expect(renderer.root.findAllByType(TrackingMap)).toHaveLength(0);
});

it('retains the last reading on connection failure and removes the warning on recovery', () => {
  render();
  act(() => useTrackingStore.getState().setError('Network request failed'));
  expect(renderer.root.findByType(TrackingMap).props.location).toEqual(
    location,
  );
  expect(text()).toContain('Showing the last known location');
  act(() => useTrackingStore.getState().setLocation({ ...location }));
  expect(text()).not.toContain('Connection interrupted');
  expect(text()).toContain('2 minutes ago');
});

it('does not show a different device location after selection changes', () => {
  useTrackingStore.setState({ deviceId: 'car-002' });
  render();
  expect(renderer.root.findAllByType(TrackingMap)).toHaveLength(0);
  expect(text()).toContain('No location received yet');
});

it('requires confirmation and keeps tracking when confirmation is cancelled', () => {
  useTrackingStore.setState({ mode: 'theft' });
  render();
  expect(text()).toContain('Theft alert active');
  act(() => button('This is a false alarm').props.onPress());
  const buttons = jest.mocked(Alert.alert).mock.calls[0][2]!;
  expect(buttons[1].text).toBe('Confirm false alarm');
  act(() => buttons[0].onPress?.());
  expect(trackingService.deactivateTheft).not.toHaveBeenCalled();
  expect(useTrackingStore.getState().mode).toBe('theft');
});

it('preserves the alert and surfaces failed deactivation', async () => {
  jest
    .mocked(trackingService.deactivateTheft)
    .mockRejectedValueOnce(new Error('HTTP 500'));
  useTrackingStore.setState({ mode: 'theft' });
  render();
  act(() => button('This is a false alarm').props.onPress());
  await act(async () => {
    await jest.mocked(Alert.alert).mock.calls[0][2]![1].onPress?.();
  });
  expect(useTrackingStore.getState().mode).toBe('theft');
  expect(Alert.alert).toHaveBeenLastCalledWith(
    'Could not deactivate',
    'The alert is still active. Check your connection and try again.',
  );
  expect(button('This is a false alarm').props.disabled).toBe(false);
});

it('disables the false-alarm action until backend completion then returns to normal', async () => {
  let finish!: () => void;
  jest
    .mocked(trackingService.deactivateTheft)
    .mockImplementationOnce(async () => {
      await new Promise<void>(resolve => {
        finish = resolve;
      });
      useTrackingStore.getState().setMode('normal');
    });
  useTrackingStore.setState({ mode: 'theft' });
  render();
  act(() => button('This is a false alarm').props.onPress());
  act(() => {
    jest.mocked(Alert.alert).mock.calls[0][2]![1].onPress?.();
  });
  expect(button('Confirming false alarm').props.disabled).toBe(true);
  expect(text()).toContain('Theft alert active');
  await act(async () => finish());
  expect(text()).toContain('Normal tracking');
  expect(text()).not.toContain('Theft alert active');
});

it('hides developer tools in release mode', () => {
  Object.defineProperty(globalThis, '__DEV__', {
    value: false,
    configurable: true,
  });
  render();
  expect(text()).not.toContain('Developer tools');
  expect(text()).not.toContain('Simulate theft alert');
});

it('keeps tracker and false-alarm actions at least 48dp tall', () => {
  useTrackingStore.setState({ mode: 'theft' });
  render();
  for (const label of ['Change vehicle tracker', 'This is a false alarm']) {
    const style = StyleSheet.flatten(
      button(label).props.style({ pressed: false }),
    );
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
  }
});
