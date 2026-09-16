/**
 * @format
 */

import { AppRegistry, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import { buildTheftAlertNotification, getTheftAlertContent } from './src/services/notificationService';

if (Platform.OS === 'android') {
  setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
    const data = remoteMessage.data || {};
    if (data.type === 'THEFT_ALERT' || data.theftMode === 'true') {
      await AsyncStorage.setItem('car-tracker.mode', 'theft');
      await notifee.displayNotification(buildTheftAlertNotification(getTheftAlertContent(remoteMessage)));
    }
  });
}

AppRegistry.registerComponent(appName, () => App);
