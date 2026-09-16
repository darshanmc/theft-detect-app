import React from 'react';
import { StyleSheet } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import {
  Camera,
  GeoJSONSource,
  Map,
  type CameraRef,
  type MapProps,
} from '@maplibre/maplibre-react-native';
import { TrackingMap } from '../src/components/TrackingMap';
import type { DeviceLocation } from '../src/api/types';

const mockJump = jest.fn();

jest.mock('@maplibre/maplibre-react-native', () => {
  const ReactRuntime = require('react');
  const { View } = require('react-native');
  return {
    Map: (props: MapProps) => ReactRuntime.createElement(View, props),
    Camera: ({ ref }: { ref: React.Ref<CameraRef> }) => {
      ReactRuntime.useImperativeHandle(ref, () => ({ jumpTo: mockJump }));
      return null;
    },
    Marker: ({ children }: React.PropsWithChildren) => children,
    GeoJSONSource: ({ children }: React.PropsWithChildren) => children,
    Layer: () => null,
  };
});

const location: DeviceLocation = {
  deviceId: 'car-001',
  lat: 37.77,
  lng: -122.41,
  headingDeg: 90,
  speedKmh: 24,
  updatedAt: '2026-09-16T10:00:00Z',
};

let renderer: ReactTestRenderer;
const map = () => renderer.root.findByType(Map);
const region = (userInteraction: boolean, bearing = 0) => {
  act(() =>
    map().props.onRegionIsChanging({
      nativeEvent: { userInteraction, bearing },
    }),
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    renderer = create(
      <TrackingMap
        key="car-001"
        location={location}
        mode="normal"
        trail={[]}
      />,
    );
  });
  act(() => map().props.onDidFinishLoadingMap());
});
afterEach(() => act(() => renderer.unmount()));

it('starts at the vehicle and follows readings without resetting zoom', () => {
  expect(renderer.root.findByType(Camera).props.initialViewState).toEqual({
    center: [-122.41, 37.77],
    zoom: 15,
  });
  region(false);
  act(() =>
    renderer.update(
      <TrackingMap
        key="car-001"
        location={{ ...location, lat: 38 }}
        mode="normal"
        trail={[]}
      />,
    ),
  );
  expect(mockJump).toHaveBeenLastCalledWith({ center: [-122.41, 38] });
});

it('keeps manual exploration until recenter and preserves it through mode changes', () => {
  region(true);
  mockJump.mockClear();
  act(() =>
    renderer.update(
      <TrackingMap
        key="car-001"
        location={{ ...location, lat: 38 }}
        mode="theft"
        trail={[]}
      />,
    ),
  );
  expect(mockJump).not.toHaveBeenCalled();
  const button = renderer.root.findByProps({
    testID: 'recenter',
    accessibilityRole: 'button',
  });
  expect(button.props.accessibilityState.selected).toBe(false);
  act(() => button.props.onPress());
  expect(mockJump).toHaveBeenLastCalledWith({ center: [-122.41, 38] });
  region(false);
  expect(button.props.accessibilityState.selected).toBe(true);
});

it('does not jump for identical coordinates and resets for another device', () => {
  mockJump.mockClear();
  act(() =>
    renderer.update(
      <TrackingMap
        key="car-001"
        location={{ ...location }}
        mode="normal"
        trail={[]}
      />,
    ),
  );
  expect(mockJump).not.toHaveBeenCalled();
  region(true);
  act(() =>
    renderer.update(
      <TrackingMap
        key="car-002"
        location={{ ...location, deviceId: 'car-002', lat: 40 }}
        mode="normal"
        trail={[]}
      />,
    ),
  );
  act(() => map().props.onDidFinishLoadingMap());
  expect(mockJump).toHaveBeenLastCalledWith({ center: [-122.41, 40] });
});

it('keeps the recenter touch target at 48dp and disables it before map readiness', () => {
  act(() =>
    renderer.update(
      <TrackingMap
        key="new-map"
        location={location}
        mode="normal"
        trail={[]}
      />,
    ),
  );
  const button = renderer.root.findByProps({
    testID: 'recenter',
    accessibilityRole: 'button',
  });
  expect(button.props.disabled).toBe(true);
  const style = StyleSheet.flatten(button.props.style({ pressed: false }));
  expect(style.width).toBeGreaterThanOrEqual(48);
  expect(style.height).toBeGreaterThanOrEqual(48);
});

it('rotates the car relative to map bearing and only draws a theft trail', () => {
  region(false, 90);
  expect(
    StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'vehicle-heading' }).props.style,
    ).transform,
  ).toEqual([{ rotate: '0deg' }]);
  const trail = [
    { latitude: 37, longitude: -122 },
    { latitude: 38, longitude: -123 },
  ];
  act(() =>
    renderer.update(
      <TrackingMap
        key="car-001"
        location={location}
        mode="theft"
        trail={trail}
      />,
    ),
  );
  expect(
    renderer.root.findByType(GeoJSONSource).props.data.geometry.coordinates,
  ).toEqual([
    [-122, 37],
    [-123, 38],
  ]);
  act(() =>
    renderer.update(
      <TrackingMap
        key="car-001"
        location={location}
        mode="normal"
        trail={trail}
      />,
    ),
  );
  expect(renderer.root.findAllByType(GeoJSONSource)).toHaveLength(0);
});

it('surfaces map failure and clears the warning after a successful load', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  act(() => map().props.onDidFailLoadingMap());
  expect(JSON.stringify(renderer.toJSON())).toContain('Map unavailable');
  expect(warn).toHaveBeenCalledWith('Tracking map failed to load');
  act(() => map().props.onDidFinishLoadingMap());
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Map unavailable');
  warn.mockRestore();
});
