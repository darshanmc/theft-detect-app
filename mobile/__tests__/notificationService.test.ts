import notifee, { AndroidCategory, AndroidImportance } from '@notifee/react-native';
import {
  buildTheftAlertNotification,
  createNotificationService,
  getTheftAlertContent,
  THEFT_CHANNEL_ID,
} from '../src/services/notificationService';
import { api } from '../src/api/client';
import { trackingService } from '../src/services/trackingService';
import { useTrackingStore } from '../src/state/trackingStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(null),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null),
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn().mockResolvedValue({}),
    createChannel: jest.fn().mockResolvedValue('theft-alerts'),
    displayNotification: jest.fn().mockResolvedValue('notif-id-1'),
  },
  AndroidImportance: {
    HIGH: 4,
  },
  AndroidCategory: {
    ALARM: 'alarm',
  },
}));

jest.mock('@react-native-firebase/messaging', () => ({
  AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2 },
  getMessaging: jest.fn(),
  getToken: jest.fn().mockResolvedValue('fcm-token-123'),
  onTokenRefresh: jest.fn().mockReturnValue(jest.fn()),
  onMessage: jest.fn().mockReturnValue(jest.fn()),
  requestPermission: jest.fn().mockResolvedValue(1),
}));

jest.mock('../src/api/client', () => ({
  api: {
    getStatus: jest.fn().mockResolvedValue({
      deviceId: 'car-001',
      lat: 37.77,
      lng: -122.41,
      theftMode: false,
    }),
    getLocation: jest.fn().mockResolvedValue({
      deviceId: 'car-001',
      lat: 37.78,
      lng: -122.42,
    }),
    registerPushToken: jest.fn().mockResolvedValue({ ok: true, registered: true }),
    triggerTheft: jest.fn().mockResolvedValue({ theftMode: true }),
    deactivateTheft: jest.fn().mockResolvedValue({ theftMode: false }),
  },
}));

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTrackingStore.setState({
      mode: 'normal',
      lastLocation: null,
      trail: [],
      lastError: null,
      hydrated: false,
    });
  });

  it('creates theft notification channel during initialization', async () => {
    const service = createNotificationService();
    await service.init();

    expect(notifee.requestPermission).toHaveBeenCalled();
    expect(notifee.createChannel).toHaveBeenCalledWith({
      id: THEFT_CHANNEL_ID,
      name: 'Theft alerts',
      importance: AndroidImportance.HIGH,
      vibration: true,
    });
    expect(api.registerPushToken).toHaveBeenCalledWith('fcm-token-123', undefined, 'android');
  });

  it('registers device push token via api client', async () => {
    const service = createNotificationService();
    await service.registerDeviceToken('token-abc-123', 'car-001');

    expect(api.registerPushToken).toHaveBeenCalledWith('token-abc-123', 'car-001', 'android');
  });

  it('re-registers cached token for a new device ID', async () => {
    const service = createNotificationService();
    await service.registerDeviceToken('token-abc-123', 'car-001');
    expect(api.registerPushToken).toHaveBeenCalledWith('token-abc-123', 'car-001', 'android');

    await service.reRegisterToken('KRG0523-59730797');
    expect(api.registerPushToken).toHaveBeenCalledWith('token-abc-123', 'KRG0523-59730797', 'android');
  });

  it('displays high-priority push notification for theft alert', async () => {
    const service = createNotificationService();
    await service.displayPushAlert('Theft Alert!', 'Vehicle moving unexpectedly');

    expect(notifee.displayNotification).toHaveBeenCalledWith({
      title: 'Theft Alert!',
      body: 'Vehicle moving unexpectedly',
      android: {
        channelId: THEFT_CHANNEL_ID,
        category: AndroidCategory.ALARM,
        importance: AndroidImportance.HIGH,
        fullScreenAction: { id: 'default', launchActivity: 'default' },
        pressAction: { id: 'default' },
      },
    });
  });

  it('enables theft mode automatically on handling theft alert in trackingService', async () => {
    expect(useTrackingStore.getState().mode).toBe('normal');

    await trackingService.handleTheftAlert('Theft Alert!', 'Car is moving');

    expect(useTrackingStore.getState().mode).toBe('theft');
    expect(notifee.displayNotification).toHaveBeenCalledWith({
      title: 'Theft Alert!',
      body: 'Car is moving',
      android: {
        channelId: THEFT_CHANNEL_ID,
        category: AndroidCategory.ALARM,
        importance: AndroidImportance.HIGH,
        fullScreenAction: { id: 'default', launchActivity: 'default' },
        pressAction: { id: 'default' },
      },
    });
  });

  it('uses structured theft payload content before legacy notification fields', () => {
    expect(
      getTheftAlertContent({
        data: {
          alertTitle: 'THEFT ALERT — KRG3496-66841242 — 100% confidence your vehicle may have been stolen.',
          plainReason: "your key wasn't found nearby; it's in an unusual location",
        },
        notification: {
          title: 'Legacy title',
          body: 'Legacy body',
        },
      }),
    ).toEqual({
      title: 'THEFT ALERT — KRG3496-66841242 — 100% confidence your vehicle may have been stolen.',
      body: "Why: your key wasn't found nearby; it's in an unusual location",
    });
  });

  it('creates a full-screen Android notification', () => {
    expect(buildTheftAlertNotification({ title: 'Title', body: 'Body' })).toEqual({
      title: 'Title',
      body: 'Body',
      android: {
        channelId: THEFT_CHANNEL_ID,
        category: AndroidCategory.ALARM,
        importance: AndroidImportance.HIGH,
        fullScreenAction: { id: 'default', launchActivity: 'default' },
        pressAction: { id: 'default' },
      },
    });
  });

  it('uses the persisted rich content when polling observes theft mode', async () => {
    useTrackingStore.setState({ deviceId: 'car-001' });
    (api.getStatus as jest.Mock).mockResolvedValueOnce({
      deviceId: 'car-001',
      lat: 37.77,
      lng: -122.41,
      theftMode: true,
      batteryPct: 90,
      alertTitle: 'THEFT ALERT — car-001 — 95% confidence your vehicle may have been stolen.',
      alertBody: "Why: your key wasn't found nearby",
    });

    await trackingService.start();

    expect(notifee.displayNotification).toHaveBeenCalledWith(
      buildTheftAlertNotification({
        title: 'THEFT ALERT — car-001 — 95% confidence your vehicle may have been stolen.',
        body: "Why: your key wasn't found nearby",
      }),
    );
    trackingService.stop();
  });
});
