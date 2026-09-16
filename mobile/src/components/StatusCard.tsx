import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DeviceLocation } from '../api/types';
import { NORMAL_POLL_MS, THEFT_POLL_MS } from '../config';
import { useTrackingStore, type TrackingMode } from '../state/trackingStore';

interface Props {
  mode: TrackingMode;
  lastLocation: DeviceLocation | null;
  lastError: string | null;
}

/** Small info card showing mode, poll cadence, device ID, last update and connectivity. */
export function StatusCard({ mode, lastLocation, lastError }: Props) {
  const deviceId = useTrackingStore((s) => s.deviceId);
  const setDeviceModalVisible = useTrackingStore((s) => s.setDeviceModalVisible);
  const pollSecs = (mode === 'theft' ? THEFT_POLL_MS : NORMAL_POLL_MS) / 1000;

  return (
    <View
      style={[styles.card, mode === 'theft' && styles.cardAboveButton]}
      pointerEvents="auto"
    >
      <View style={styles.headerRow}>
        <Text style={styles.deviceText} numberOfLines={1}>
          Device: <Text style={styles.deviceIdValue}>{deviceId || 'None'}</Text>
        </Text>
        <Pressable
          style={styles.switchButton}
          onPress={() => setDeviceModalVisible(true)}
          hitSlop={8}
        >
          <Text style={styles.switchText}>Switch</Text>
        </Pressable>
      </View>

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
    maxWidth: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  /** In theft mode the deactivate button occupies the bottom — sit above it. */
  cardAboveButton: { bottom: 96 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cfd8dc',
  },
  deviceText: {
    fontSize: 12,
    color: '#455a64',
    flex: 1,
    marginRight: 8,
  },
  deviceIdValue: {
    fontWeight: '700',
    color: '#0284c7',
  },
  switchButton: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  switchText: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '700',
  },
  row: { fontSize: 12, color: '#455a64' },
  value: { fontWeight: '700', color: '#263238' },
  theft: { color: '#c62828' },
  error: { fontSize: 11, color: '#c62828', marginTop: 4 },
});
