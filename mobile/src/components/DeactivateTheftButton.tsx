import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { trackingService } from '../services/trackingService';
import { colors, radius, spacing } from '../theme';

export function DeactivateTheftButton() {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const confirming = useRef(false);

  const deactivate = async () => {
    if (pending.current) return;
    pending.current = true;
    confirming.current = false;
    setBusy(true);
    try {
      await trackingService.deactivateTheft();
    } catch (err) {
      console.warn('Could not deactivate theft mode', err);
      Alert.alert(
        'Could not deactivate',
        'The alert is still active. Check your connection and try again.',
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const onPress = () => {
    if (pending.current || confirming.current) return;
    confirming.current = true;
    Alert.alert(
      'Is this a false alarm?',
      'Only confirm if this alert was a false alarm. High-frequency tracking will stop.',
      [
        {
          text: 'Keep tracking',
          style: 'cancel',
          onPress: () => {
            confirming.current = false;
          },
        },
        {
          text: 'Confirm false alarm',
          style: 'destructive',
          onPress: deactivate,
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          confirming.current = false;
        },
      },
    );
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={
        busy ? 'Confirming false alarm' : 'This is a false alarm'
      }
      accessibilityState={{ disabled: busy, busy }}
    >
      {busy ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.label}>This is a false alarm</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    backgroundColor: colors.text,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: 'center',
  },
  pressed: { opacity: 0.85 },
  label: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
