import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { trackingService } from '../services/trackingService';

/**
 * Development-only helpers. In v1 (simulated alerts) this is how you trigger
 * a theft alert without a real backend/FCM. Not rendered in release builds.
 */
export function DevMenu() {
  const [busy, setBusy] = useState(false);
  if (!__DEV__) return null;

  const simulate = async () => {
    setBusy(true);
    try {
      await trackingService.simulateTheftAlert();
    } catch (err) {
      Alert.alert(
        'Simulation failed',
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={simulate} disabled={busy}>
        <Text style={styles.label}>{busy ? '…' : 'Simulate theft alert'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 8, right: 8, zIndex: 20 },
  button: {
    backgroundColor: 'rgba(33, 33, 33, 0.75)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  label: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
