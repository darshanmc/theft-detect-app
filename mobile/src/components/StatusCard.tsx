import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DeviceLocation } from '../api/types';
import { useLocationAge } from '../hooks/useLocationAge';
import { useTrackingStore, type TrackingMode } from '../state/trackingStore';
import { colors, radius, spacing } from '../theme';
import { DeactivateTheftButton } from './DeactivateTheftButton';
import { DevMenu } from './DevMenu';
import { TheftModeBanner } from './TheftModeBanner';

interface Props {
  mode: TrackingMode;
  lastLocation: DeviceLocation | null;
  lastError: string | null;
  hydrated: boolean;
}

export function StatusCard({ mode, lastLocation, lastError, hydrated }: Props) {
  const deviceId = useTrackingStore(s => s.deviceId);
  const setDeviceModalVisible = useTrackingStore(s => s.setDeviceModalVisible);
  const { age, absoluteTime } = useLocationAge(lastLocation?.updatedAt);
  const speed = lastLocation?.speedKmh;
  const scroll = useRef<React.ElementRef<typeof ScrollView>>(null);

  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [mode, deviceId]);

  return (
    <ScrollView
      ref={scroll}
      style={styles.card}
      contentContainerStyle={styles.content}
      alwaysBounceVertical={false}
    >
      {mode === 'theft' && <TheftModeBanner />}
      <View style={styles.identity}>
        <View style={styles.vehicle}>
          <Text style={styles.title} accessibilityRole="header">
            My vehicle
          </Text>
          <Text style={styles.device}>
            {deviceId || 'No tracker connected'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            deviceId ? 'Change vehicle tracker' : 'Connect vehicle tracker'
          }
          accessibilityState={{ disabled: !hydrated }}
          disabled={!hydrated}
          style={({ pressed }) => [
            styles.switchButton,
            pressed && styles.pressed,
          ]}
          onPress={() => setDeviceModalVisible(true)}
        >
          <Text style={styles.switchText}>
            {deviceId ? 'Change device' : 'Connect tracker'}
          </Text>
        </Pressable>
      </View>

      {mode === 'normal' && (
        <View style={styles.status}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            {deviceId ? 'Normal tracking' : 'Ready to connect'}
          </Text>
        </View>
      )}
      <View style={styles.reading}>
        <Text style={styles.readingTitle}>
          {lastLocation ? age : 'No location received yet'}
        </Text>
        {absoluteTime && <Text style={styles.detail}>{absoluteTime}</Text>}
        {lastLocation && (
          <View style={styles.speedRow}>
            <Text style={styles.detail}>Last reported speed</Text>
            <Text style={styles.speed}>
              {speed !== undefined && Number.isFinite(speed) && speed >= 0
                ? `${Math.round(speed)} km/h`
                : 'Unavailable'}
            </Text>
          </View>
        )}
      </View>

      {lastError !== null && (
        <View style={styles.warning} accessibilityLiveRegion="polite">
          <Text style={styles.warningTitle}>Connection interrupted</Text>
          <Text style={styles.warningText}>
            {lastLocation
              ? 'Showing the last known location. New readings are currently unavailable.'
              : 'We cannot get a location right now. Check your connection.'}
            {' Requests will retry automatically.'}
          </Text>
        </View>
      )}
      {mode === 'theft' && <DeactivateTheftButton />}
      <DevMenu />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: '55%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  content: { padding: spacing.md, gap: spacing.sm },
  identity: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  vehicle: { gap: spacing.xs, flexGrow: 1, flexShrink: 1, minWidth: 140 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  device: { fontSize: 14, color: colors.muted },
  switchButton: {
    alignSelf: 'flex-start',
    flexShrink: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  switchText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  pressed: { opacity: 0.75 },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  statusText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    flexShrink: 1,
  },
  reading: {
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  readingTitle: { fontSize: 16, color: colors.text, fontWeight: '600' },
  detail: { fontSize: 14, color: colors.muted, flexShrink: 1 },
  speedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  speed: { fontSize: 18, fontWeight: '700', color: colors.text },
  warning: {
    padding: spacing.md,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  warningTitle: { color: colors.warning, fontSize: 15, fontWeight: '700' },
  warningText: { color: colors.warning, fontSize: 14 },
});
