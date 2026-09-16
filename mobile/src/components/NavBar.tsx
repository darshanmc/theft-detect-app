import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

export function NavBar() {
  return (
    <View style={styles.navBar}>
      <Text style={styles.title} accessibilityRole="header">
        RecovR RAPID
      </Text>
      <Text style={styles.subtitle}>Vehicle tracking</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    minHeight: 64,
    backgroundColor: colors.canvas,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 2 },
});
