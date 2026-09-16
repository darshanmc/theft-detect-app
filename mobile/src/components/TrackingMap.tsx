import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type MapProps,
} from '@maplibre/maplibre-react-native';
import type { DeviceLocation } from '../api/types';
import type { MapPoint, TrackingMode } from '../state/trackingStore';
import { colors, spacing } from '../theme';
import { VehicleMarker } from './VehicleMarker';

const OSM_STYLE = JSON.stringify({
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution:
        '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': colors.canvas },
    },
    { id: 'osm', type: 'raster', source: 'osm' },
  ],
});
const TRAIL_STYLE = {
  lineColor: colors.alert,
  lineWidth: 4,
  lineCap: 'round',
} as const;

interface Props {
  location: DeviceLocation;
  mode: TrackingMode;
  trail: MapPoint[];
}

export function TrackingMap({ location, mode, trail }: Props) {
  const camera = useRef<CameraRef>(null);
  const initialView = useRef({
    center: [location.lng, location.lat] as [number, number],
    zoom: 15,
  });
  const [ready, setReady] = useState(false);
  const [following, setFollowing] = useState(true);
  const [bearing, setBearing] = useState(0);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (ready && following) {
      camera.current?.jumpTo({ center: [location.lng, location.lat] });
    }
  }, [ready, following, location.lng, location.lat]);

  const onRegionChange: NonNullable<MapProps['onRegionIsChanging']> = event => {
    if (event.nativeEvent.userInteraction) setFollowing(false);
    setBearing(event.nativeEvent.bearing);
  };

  const trailFeature: GeoJSON.Feature | null =
    mode === 'theft' && trail.length > 1
      ? {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: trail.map(point => [point.longitude, point.latitude]),
          },
          properties: {},
        }
      : null;

  return (
    <View style={styles.container}>
      {mapError && (
        <Text style={styles.mapWarning} accessibilityLiveRegion="polite">
          Map unavailable. Your vehicle reading is still shown below.
        </Text>
      )}
      <View style={styles.viewport}>
        <Map
          testID="tracking-map"
          style={styles.map}
          mapStyle={OSM_STYLE}
          touchPitch={false}
          attributionPosition={{ bottom: 12, left: 12 }}
          logoPosition={{ top: 12, left: 12 }}
          compassPosition={{ top: 12, right: 16 }}
          onRegionWillChange={onRegionChange}
          onRegionIsChanging={onRegionChange}
          onRegionDidChange={onRegionChange}
          onDidFinishLoadingMap={() => {
            setReady(true);
            setMapError(false);
          }}
          onDidFailLoadingMap={() => {
            console.warn('Tracking map failed to load');
            setMapError(true);
          }}
        >
          <Camera ref={camera} initialViewState={initialView.current} />
          {trailFeature && (
            <GeoJSONSource id="theft-trail" data={trailFeature}>
              <Layer type="line" style={TRAIL_STYLE} />
            </GeoJSONSource>
          )}
          <Marker lngLat={[location.lng, location.lat]}>
            <VehicleMarker
              heading={location.headingDeg}
              bearing={bearing}
              theft={mode === 'theft'}
            />
          </Marker>
        </Map>
        <Pressable
          testID="recenter"
          accessibilityRole="button"
          accessibilityLabel={
            following ? 'Following vehicle' : 'Recenter and follow vehicle'
          }
          accessibilityHint="Centers the map on the last reported location and follows new readings"
          accessibilityState={{ selected: following, disabled: !ready }}
          disabled={!ready}
          style={({ pressed }) => [
            styles.recenter,
            following && styles.following,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            camera.current?.jumpTo({ center: [location.lng, location.lat] });
            setFollowing(true);
          }}
        >
          <View style={[styles.target, following && styles.selectedTarget]}>
            <View style={[styles.targetDot, following && styles.selectedDot]} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  viewport: { flex: 1 },
  map: { flex: 1 },
  mapWarning: {
    backgroundColor: colors.warningSoft,
    color: colors.warning,
    padding: spacing.sm,
    fontSize: 14,
  },
  recenter: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  following: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.75 },
  target: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTarget: { borderColor: colors.surface },
  targetDot: { width: 6, height: 6, backgroundColor: colors.primary },
  selectedDot: { backgroundColor: colors.surface, borderRadius: 3 },
});
