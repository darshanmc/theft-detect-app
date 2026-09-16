import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { markerRotation } from '../utils/locationPresentation';

interface Props {
  heading: number;
  bearing: number;
  theft: boolean;
}

export function VehicleMarker({ heading, bearing, theft }: Props) {
  const rotation = markerRotation(heading, bearing);
  useEffect(() => {
    if (rotation === null)
      console.warn('Vehicle direction unavailable', { heading, bearing });
  }, [rotation, heading, bearing]);
  return (
    <View
      style={[styles.halo, theft && styles.alertHalo]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Your vehicle's last reported location${
        rotation === null
          ? ', direction unavailable'
          : `, heading ${Math.round(heading)} degrees`
      }${theft ? ', theft alert active' : ''}`}
    >
      <View
        testID="vehicle-heading"
        style={[styles.car, { transform: [{ rotate: `${rotation ?? 0}deg` }] }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={[styles.wheel, styles.frontLeft]} />
        <View style={[styles.wheel, styles.frontRight]} />
        <View style={[styles.wheel, styles.rearLeft]} />
        <View style={[styles.wheel, styles.rearRight]} />
        <View style={[styles.body, theft && styles.alertBody]}>
          <View style={styles.headlights} />
          <View style={styles.windshield} />
          <View style={styles.rearWindow} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    borderColor: colors.surface,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  alertHalo: { backgroundColor: colors.alertSoft, borderColor: colors.alert },
  car: { width: 32, height: 44, alignItems: 'center' },
  body: {
    width: 24,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    paddingTop: 4,
  },
  alertBody: { backgroundColor: colors.alert },
  headlights: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FFF5DC',
  },
  windshield: {
    width: 18,
    height: 9,
    borderRadius: 3,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
  },
  rearWindow: {
    width: 16,
    height: 6,
    borderRadius: 2,
    marginTop: 11,
    backgroundColor: '#FFFFFF',
  },
  wheel: {
    position: 'absolute',
    width: 5,
    height: 10,
    borderRadius: 2,
    backgroundColor: colors.text,
  },
  frontLeft: { top: 7, left: 1 },
  frontRight: { top: 7, right: 1 },
  rearLeft: { bottom: 6, left: 1 },
  rearRight: { bottom: 6, right: 1 },
});
