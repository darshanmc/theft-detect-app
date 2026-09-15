import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MapScreen from './src/screens/MapScreen';
import { notificationService } from './src/services/notificationService';
import { trackingService } from './src/services/trackingService';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    // Notification permission + channel + push token registration + theft listener.
    notificationService
      .init(() => {
        trackingService
          .handleTheftAlert()
          .catch((err) => console.warn('handleTheftAlert failed', err));
      })
      .catch((err) => console.warn('notification init failed', err));
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <MapScreen />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default App;
