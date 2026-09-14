import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { THEFT_POLL_MS } from '../config';

/** Red banner shown at the top of the screen while theft mode is active. */
export function TheftModeBanner() {
  return (
    <View style={styles.banner} pointerEvents="none">
      <Text style={styles.title}>THEFT MODE ACTIVE</Text>
      <Text style={styles.subtitle}>
        Live tracking — updating every {THEFT_POLL_MS / 1000}s
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#c62828',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    elevation: 6,
    zIndex: 10,
  },
  title: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  subtitle: { color: '#ffcdd2', fontSize: 12, marginTop: 2 },
});
