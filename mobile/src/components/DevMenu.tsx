import React, { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { trackingService } from '../services/trackingService';
import { useTrackingStore } from '../state/trackingStore';
import { colors, radius, spacing } from '../theme';

/**
 * Development-only helpers. In v1 (simulated alerts) this is how you trigger
 * a theft alert without a real backend/FCM. Not rendered in release builds.
 */
export function DevMenu() {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const deviceId = useTrackingStore(s => s.deviceId);
  const mode = useTrackingStore(s => s.mode);
  if (!__DEV__) return null;

  const simulate = async () => {
    if (!__DEV__ || pending.current || !deviceId || mode === 'theft') return;
    pending.current = true;
    setBusy(true);
    try {
      await trackingService.simulateTheftAlert();
    } catch (err) {
      Alert.alert(
        'Simulation failed',
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.button}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.label}>Developer tools</Text>
      </Pressable>
      {expanded && (
        <Pressable
          style={styles.button}
          accessibilityRole="button"
          accessibilityState={{
            disabled: busy || !deviceId || mode === 'theft',
            busy,
          }}
          onPress={simulate}
          disabled={busy || !deviceId || mode === 'theft'}
        >
          <Text style={styles.label}>
            {busy ? 'Simulating...' : 'Simulate theft alert'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  label: { color: colors.muted, fontSize: 14, fontWeight: '600' },
});
