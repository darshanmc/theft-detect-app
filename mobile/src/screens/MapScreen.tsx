import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DeviceSelectionModal } from '../components/DeviceSelectionModal';
import { StatusCard } from '../components/StatusCard';
import { TrackingMap } from '../components/TrackingMap';
import { useTracking } from '../hooks/useTracking';
import { colors, spacing } from '../theme';

export default function MapScreen() {
  const { mode, lastLocation, trail, lastError, hydrated, deviceId } =
    useTracking();
  const location = lastLocation?.deviceId === deviceId ? lastLocation : null;
  const waiting = !hydrated || (Boolean(deviceId) && !location && !lastError);

  useEffect(() => {
    if (lastError) console.warn('Vehicle location request failed', lastError);
  }, [lastError]);

  return (
    <View style={styles.container}>
      {location ? (
        <TrackingMap
          key={deviceId}
          location={location}
          mode={mode}
          trail={trail}
        />
      ) : (
        <ScrollView
          style={styles.empty}
          contentContainerStyle={styles.emptyContent}
        >
          {waiting && <ActivityIndicator size="large" color={colors.primary} />}
          <Text style={styles.emptyTitle} accessibilityRole="header">
            {!hydrated
              ? 'Getting things ready'
              : !deviceId
              ? 'Your vehicle, in view'
              : lastError
              ? 'Location unavailable'
              : 'Waiting for your vehicle'}
          </Text>
          <Text style={styles.emptyText}>
            {!hydrated
              ? 'Restoring your tracker.'
              : !deviceId
              ? 'Connect the tracker attached to your vehicle to see its location.'
              : lastError
              ? 'Check your connection. We will request the location again automatically.'
              : 'The map will appear when the first location reading arrives.'}
          </Text>
        </ScrollView>
      )}
      <StatusCard
        mode={mode}
        lastLocation={location}
        lastError={lastError}
        hydrated={hydrated}
      />
      <DeviceSelectionModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  empty: { flex: 1 },
  emptyContent: {
    flexGrow: 1,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: { color: colors.muted, fontSize: 16, textAlign: 'center' },
});
