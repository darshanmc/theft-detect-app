import notifee, { AndroidCategory, AndroidImportance } from '@notifee/react-native';
import { api } from '../api/client';
import type { DeviceStatus } from '../api/types';

/**
 * Push Notification and Theft Alert Service.
 *
 * Integrates FCM / AWS SNS push notifications with Notifee:
 * 1. Requests notification permissions (Android 13+ POST_NOTIFICATIONS).
 * 2. Creates high-importance notification channel for theft alerts.
 * 3. Registers device FCM token with the backend (POST /v1/devices/:id/push-token).
 * 4. Listens for foreground push messages and invokes the onTheftAlert callback.
 */
export interface NotificationService {
  /** Request permissions, create channels, and register FCM token. Call once at app start. */
  init(onTheftAlertReceived?: () => void): Promise<void>;
  /** Surface a high-priority "possible theft" alert to the user. */
  notifyTheftAlert(status: DeviceStatus): Promise<void>;
  /** Display a high-priority push alert directly. */
  displayPushAlert(title: string, body: string): Promise<void>;
  /** Register push token directly with the backend for a given or active device ID. */
  registerDeviceToken(token: string, deviceId?: string): Promise<void>;
  /** Re-register the cached token when active device ID changes. */
  reRegisterToken(deviceId?: string): Promise<void>;
}

export const THEFT_CHANNEL_ID = 'theft-alerts';

const FALLBACK_ALERT_TITLE = 'Possible theft detected';
const FALLBACK_ALERT_BODY = 'Your car may be stolen. Tap to track it live.';

interface RemoteTheftMessage {
  data?: Record<string, unknown>;
  notification?: {
    title?: unknown;
    body?: unknown;
  };
}

export interface TheftAlertContent {
  title: string;
  body: string;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function getTheftAlertContent(message: RemoteTheftMessage): TheftAlertContent {
  const data = message.data || {};
  const notification = message.notification || {};
  const plainReason = stringValue(data.plainReason);

  return {
    title:
      stringValue(data.alertTitle) ||
      stringValue(notification.title) ||
      FALLBACK_ALERT_TITLE,
    body:
      stringValue(data.alertBody) ||
      (plainReason ? `Why: ${plainReason}` : undefined) ||
      stringValue(notification.body) ||
      FALLBACK_ALERT_BODY,
  };
}

export function buildTheftAlertNotification(content: TheftAlertContent) {
  return {
    title: content.title,
    body: content.body,
    android: {
      channelId: THEFT_CHANNEL_ID,
      category: AndroidCategory.ALARM,
      importance: AndroidImportance.HIGH,
      fullScreenAction: { id: 'default', launchActivity: 'default' },
      pressAction: { id: 'default' },
    },
  };
}

export function createNotificationService(): NotificationService {
  let pushUnsubscribe: (() => void) | null = null;
  let tokenRefreshUnsubscribe: (() => void) | null = null;
  let cachedToken: string | null = null;

  const displayPushAlert = async (title: string, body: string) => {
    await notifee.displayNotification(buildTheftAlertNotification({ title, body }));
  };

  const registerDeviceToken = async (token: string, deviceId?: string) => {
    try {
      cachedToken = token;
      await api.registerPushToken(token, deviceId, 'android');
    } catch (err) {
      console.warn('Failed to register push token with backend:', err);
    }
  };

  const reRegisterToken = async (deviceId?: string) => {
    if (cachedToken) {
      await registerDeviceToken(cachedToken, deviceId);
    }
  };

  return {
    async init(onTheftAlertReceived) {
      // Android 13+ requires a runtime permission to show notifications.
      await notifee.requestPermission();
      await notifee.createChannel({
        id: THEFT_CHANNEL_ID,
        name: 'Theft alerts',
        importance: AndroidImportance.HIGH,
        vibration: true,
      });

      // Initialize Firebase messaging when available
      try {
        const messagingModule = require('@react-native-firebase/messaging');
        const messaging = messagingModule?.default || messagingModule;
        if (typeof messaging === 'function') {
          const msgInstance = messaging();
          const authStatus = await msgInstance.requestPermission?.();
          const enabled =
            authStatus === 1 || // AuthorizationStatus.AUTHORIZED
            authStatus === 2;   // AuthorizationStatus.PROVISIONAL

          if (enabled !== false) {
            const token = await msgInstance.getToken?.();
            if (token) {
              await registerDeviceToken(token);
            }

            tokenRefreshUnsubscribe?.();
            tokenRefreshUnsubscribe = msgInstance.onTokenRefresh?.((newToken: string) => {
              registerDeviceToken(newToken);
            });

            pushUnsubscribe?.();
            pushUnsubscribe = msgInstance.onMessage?.(async (remoteMessage: any) => {
              const data = remoteMessage?.data || {};
              if (data.type === 'THEFT_ALERT' || data.theftMode === 'true') {
                const { title, body } = getTheftAlertContent(remoteMessage);
                await displayPushAlert(title, body);
                onTheftAlertReceived?.();
              }
            });
          }
        }
      } catch {
        // Firebase messaging optional / not bundled in test env
      }
    },

    async notifyTheftAlert(status) {
      await displayPushAlert(
        'Possible theft detected',
        `Your car may be stolen — last seen moving at ${Math.round(
          status.speedKmh,
        )} km/h. Tap to track it live.`,
      );
    },

    displayPushAlert,
    registerDeviceToken,
    reRegisterToken,
  };
}

export const notificationService: NotificationService =
  createNotificationService();
