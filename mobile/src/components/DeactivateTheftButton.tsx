import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';
import { trackingService } from '../services/trackingService';

/**
 * Button pinned to the bottom of the screen while theft mode is active.
 * Lets the user mark the alert as a false alarm and return to normal mode.
 */
export function DeactivateTheftButton() {
  const [busy, setBusy] = useState(false);

  const deactivate = async () => {
    setBusy(true);
    try {
      await trackingService.deactivateTheft();
    } catch (err) {
      Alert.alert(
        'Could not deactivate',
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setBusy(false);
    }
  };

  const onPress = () => {
    Alert.alert(
      'Deactivate theft mode?',
      'Only do this if the alert was a false alarm. Live 5s tracking will stop.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deactivate', style: 'destructive', onPress: deactivate },
      ],
    );
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={onPress}
      disabled={busy}
    >
      {busy ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.label}>Deactivate theft mode (false alarm)</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#37474f',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 4,
    zIndex: 10,
  },
  pressed: { opacity: 0.85 },
  label: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
