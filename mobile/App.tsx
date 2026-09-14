import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MapScreen from './src/screens/MapScreen';
import { notificationService } from './src/services/notificationService';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    // Notification permission + channel (simulated-alert implementation in v1).
    notificationService
      .init()
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
