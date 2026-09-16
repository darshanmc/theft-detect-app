/**
 * @format
 */

import { AppRegistry } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import { buildTheftAlertNotification, getTheftAlertContent } from './src/services/notificationService';

// Register background push message handler for theft detection alerts
try {
  const messagingModule = require('@react-native-firebase/messaging');
  const messaging = messagingModule?.default || messagingModule;
  if (typeof messaging === 'function') {
    messaging().setBackgroundMessageHandler?.(async (remoteMessage) => {
      const data = remoteMessage?.data || {};
      if (data.type === 'THEFT_ALERT' || data.theftMode === 'true') {
        await AsyncStorage.setItem('car-tracker.mode', 'theft').catch(() => undefined);
        await notifee.displayNotification(buildTheftAlertNotification(getTheftAlertContent(remoteMessage)));
      }
    });
  }
} catch {
  // Firebase messaging optional in mock / test environment
}

AppRegistry.registerComponent(appName, () => App);
