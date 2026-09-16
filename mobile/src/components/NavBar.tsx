import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function NavBar() {
  return (
    <View style={styles.navBar}>
      <Text style={styles.title}>RecovR RAPID</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    height: 52,
    backgroundColor: '#1565C0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    zIndex: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
