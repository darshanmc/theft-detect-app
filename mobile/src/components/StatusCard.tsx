import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DeviceLocation } from '../api/types';
import { NORMAL_POLL_MS, THEFT_POLL_MS } from '../config';
import type { TrackingMode } from '../state/trackingStore';

interface Props {
  mode: TrackingMode;
  lastLocation: DeviceLocation | null;
  lastError: string | null;
}

/** Small info card showing mode, poll cadence, last update and connectivity. */
export function StatusCard({ mode, lastLocation, lastError }: Props) {
  const pollSecs = (mode === 'theft' ? THEFT_POLL_MS : NORMAL_POLL_MS) / 1000;
  return (
    <View
      style={[styles.card, mode === 'theft' && styles.cardAboveButton]}
      pointerEvents="none"
    >
      <Text style={styles.row}>
        Mode:{' '}
        <Text style={[styles.value, mode === 'theft' && styles.theft]}>
          {mode === 'theft' ? 'THEFT' : 'Normal'}
        </Text>
        {'  ·  polling every '}
        {pollSecs}s
      </Text>
      <Text style={styles.row}>
        Last update:{' '}
        <Text style={styles.value}>
          {lastLocation ? new Date(lastLocation.updatedAt).toLocaleTimeString() : '—'}
        </Text>
      </Text>
      {lastLocation != null && (
        <Text style={styles.row}>
          Speed: <Text style={styles.value}>{Math.round(lastLocation.speedKmh)} km/h</Text>
        </Text>
      )}
      {lastError != null && (
        <Text style={styles.error}>
          Connection issue: {lastError} — showing last known location
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    maxWidth: '75%',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 8,
    padding: 8,
    elevation: 2,
  },
  /** In theft mode the deactivate button occupies the bottom — sit above it. */
  cardAboveButton: { bottom: 96 },
  row: { fontSize: 12, color: '#455a64' },
  value: { fontWeight: '700', color: '#263238' },
  theft: { color: '#c62828' },
  error: { fontSize: 11, color: '#c62828', marginTop: 4 },
});
