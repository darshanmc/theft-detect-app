import React, { useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
} from '@maplibre/maplibre-react-native';
import { DeactivateTheftButton } from '../components/DeactivateTheftButton';
import { DevMenu } from '../components/DevMenu';
import { StatusCard } from '../components/StatusCard';
import { TheftModeBanner } from '../components/TheftModeBanner';
import { useTracking } from '../hooks/useTracking';

// Raster style pointing at the OSM tile server — no API key required.
// (v11 needs an explicit style instead of the removed default.)
const OSM_STYLE = JSON.stringify({
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#e8eef1' } },
    { id: 'osm', type: 'raster', source: 'osm' },
  ],
} as const);

// Downtown San Francisco until the first real reading arrives.
const FALLBACK_CENTER: [number, number] = [-122.4194, 37.7749]; // [lng, lat]

export default function MapScreen() {
  const { mode, lastLocation, trail, lastError, hydrated } = useTracking();
  const cameraRef = useRef<CameraRef>(null);

  const center: [number, number] = lastLocation
    ? [lastLocation.lng, lastLocation.lat]
    : FALLBACK_CENTER;

  const trailFeature: GeoJSON.Feature | null =
    mode === 'theft' && trail.length > 1
      ? {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: trail.map((p) => [p.longitude, p.latitude]),
          },
          properties: {},
        }
      : null;

  return (
    <View style={styles.container}>
      <Map style={styles.map} mapStyle={OSM_STYLE}>
        <Camera ref={cameraRef} center={center} zoom={15} />

        {lastLocation && (
          <Marker lngLat={[lastLocation.lng, lastLocation.lat]}>
            <View style={styles.marker}>
              <Text style={styles.markerText}>CAR</Text>
            </View>
          </Marker>
        )}

        {trailFeature && (
          <GeoJSONSource id="theft-trail" data={trailFeature}>
            <Layer
              type="line"
              style={{ lineColor: '#c62828', lineWidth: 4, lineCap: 'round' }}
            />
          </GeoJSONSource>
        )}
      </Map>

      {(!hydrated || !lastLocation) && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#37474f" />
          <Text style={styles.loadingText}>
            {lastError ? `Can't reach backend:\n${lastError}` : 'Locating your car...'}
          </Text>
        </View>
      )}

      {mode === 'theft' && <TheftModeBanner />}
      <StatusCard mode={mode} lastLocation={lastLocation} lastError={lastError} />
      {mode === 'theft' && <DeactivateTheftButton />}
      <DevMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  marker: {
    backgroundColor: '#263238',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  loadingText: {
    marginTop: 12,
    color: '#37474f',
    fontSize: 14,
    textAlign: 'center',
  },
});
