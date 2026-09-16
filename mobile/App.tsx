import React, { useEffect } from 'react';
import { Alert, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MapScreen from './src/screens/MapScreen';
import { NavBar } from './src/components/NavBar';
import { notificationService } from './src/services/notificationService';
import { trackingService } from './src/services/trackingService';
import { colors } from './src/theme';
import {
  canUseFullScreenIntent,
  openFullScreenIntentSettings,
} from './src/config';

function App() {
  useEffect(() => {
    // Notification permission + channel + push token registration + theft listener.
    notificationService
      .init(() => {
        trackingService
          .handleTheftAlert()
          .catch(err => console.warn('handleTheftAlert failed', err));
      })
      .catch(err => console.warn('notification init failed', err));

    canUseFullScreenIntent()
      .then(enabled => {
        if (!enabled) {
          Alert.alert(
            'Enable full-screen theft alerts',
            'Android must allow full-screen notifications for this app to open live tracking when a theft alert arrives on the lock screen.',
            [
              { text: 'Not now', style: 'cancel' },
              {
                text: 'Open settings',
                onPress: () => {
                  openFullScreenIntentSettings().catch(err =>
                    console.warn(
                      'Could not open full-screen notification settings',
                      err,
                    ),
                  );
                },
              },
            ],
          );
        }
      })
      .catch(err =>
        console.warn('Could not check full-screen notification access', err),
      );
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView
        style={styles.container}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <NavBar />
        <MapScreen />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
});

export default App;
