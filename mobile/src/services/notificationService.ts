import notifee, { AndroidImportance } from '@notifee/react-native';
import type { DeviceStatus } from '../api/types';

/**
 * Abstraction over "the backend told us the car is stolen".
 *
 * v1 ships with a SIMULATED implementation: the app notices the theft flag
 * while polling and raises a LOCAL notification. When the real backend is
 * ready, add an FCM-based implementation of this interface and swap the export
 * below — no screen-level code changes needed.
 */
export interface NotificationService {
  /** Request permissions / create channels. Call once at app start. */
  init(): Promise<void>;
  /** Surface a high-priority "possible theft" alert to the user. */
  notifyTheftAlert(status: DeviceStatus): Promise<void>;
}

const THEFT_CHANNEL_ID = 'theft-alerts';

function createSimulatedNotificationService(): NotificationService {
  return {
    async init() {
      // Android 13+ requires a runtime permission to show notifications.
      await notifee.requestPermission();
      await notifee.createChannel({
        id: THEFT_CHANNEL_ID,
        name: 'Theft alerts',
        importance: AndroidImportance.HIGH,
        vibration: true,
      });
    },

    async notifyTheftAlert(status) {
      await notifee.displayNotification({
        title: 'Possible theft detected',
        body: `Your car may be stolen — last seen moving at ${Math.round(
          status.speedKmh,
        )} km/h. Tap to track it live.`,
        android: {
          channelId: THEFT_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: { id: 'default' }, // tapping opens the app
        },
      });
    },
  };
}

export const notificationService: NotificationService =
  createSimulatedNotificationService();
