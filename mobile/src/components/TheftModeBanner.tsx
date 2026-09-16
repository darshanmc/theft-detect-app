import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { THEFT_POLL_MS } from '../config';
import { colors, radius, spacing } from '../theme';

export function TheftModeBanner() {
  return (
    <View style={styles.banner} accessibilityLiveRegion="assertive" accessible>
      <Text style={styles.title}>Theft alert active</Text>
      <Text style={styles.subtitle}>
        Requesting a location every {THEFT_POLL_MS / 1000}s. Check the reading
        time below.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.alert,
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  title: { color: colors.surface, fontWeight: '700', fontSize: 18 },
  subtitle: { color: colors.surface, fontSize: 14, marginTop: spacing.xs },
});
