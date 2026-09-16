import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEVICE_STORAGE_KEY, DEFAULT_DEVICE_ID, NORMAL_POLL_MS, THEFT_POLL_MS } from '../config';
import { api } from '../api/client';
import type { DeviceStatus } from '../api/types';
import { useTrackingStore } from '../state/trackingStore';
import { notificationService } from './notificationService';

/**
 * Polls the backend and drives the tracking store.
 *
 *  - normal mode: polls /status every NORMAL_POLL_MS (location + theft flag)
 *  - theft mode:  polls /location every THEFT_POLL_MS (5s live tracking)
 *
 * The mode and active device ID are persisted, so killing and reopening the app keeps tracking the selected car.
 */
const MODE_STORAGE_KEY = 'car-tracker.mode';

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let appStateSub: { remove: () => void } | null = null;

const store = () => useTrackingStore.getState();

async function tick(): Promise<void> {
  const currentDeviceId = store().deviceId;
  if (!currentDeviceId) {
    return;
  }

  try {
    if (store().mode === 'theft') {
      store().setLocation(await api.getLocation(currentDeviceId));
    } else {
      const status = await api.getStatus(currentDeviceId);
      store().setLocation(status);
      if (status.theftMode) {
        await enterTheftMode(status);
      }
    }
  } catch (err) {
    // Transient network errors keep the last known location on screen.
    store().setError(err instanceof Error ? err.message : String(err));
  }
}

function scheduleNext(): void {
  if (!running || !store().deviceId) return;
  if (timer) clearTimeout(timer);
  const delay = store().mode === 'theft' ? THEFT_POLL_MS : NORMAL_POLL_MS;
  timer = setTimeout(async () => {
    await tick();
    scheduleNext();
  }, delay);
}

async function enterTheftMode(status: DeviceStatus): Promise<void> {
  if (store().mode === 'theft') return;
  store().setMode('theft');
  await AsyncStorage.setItem(MODE_STORAGE_KEY, 'theft').catch(() => undefined);
  await notificationService.notifyTheftAlert(status).catch(() => undefined);
  await tick(); // fetch a fresh location right away
  scheduleNext(); // switch the loop to the theft cadence now
}

export const trackingService = {
  /** Restore persisted mode and device ID and start the polling loop. Idempotent. */
  async start(): Promise<void> {
    if (running) return;
    running = true;

    const [savedMode, savedDeviceId] = await Promise.all([
      AsyncStorage.getItem(MODE_STORAGE_KEY).catch(() => null),
      AsyncStorage.getItem(DEVICE_STORAGE_KEY).catch(() => null),
    ]);

    const initialDeviceId = savedDeviceId?.trim() || DEFAULT_DEVICE_ID?.trim() || null;
    if (initialDeviceId) {
      store().setDeviceId(initialDeviceId);
    }

    if (savedMode === 'theft') {
      store().setMode('theft');
    }
    store().setHydrated(true);

    if (store().deviceId) {
      await tick();
      scheduleNext();
    } else {
      store().setDeviceModalVisible(true);
    }

    // Refresh immediately whenever the app comes back to the foreground.
    appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
  },

  /** Switch to a new device ID or set device for the first time. */
  async setDevice(newDeviceId: string): Promise<void> {
    const trimmed = newDeviceId.trim();
    if (!trimmed) return;

    if (timer) clearTimeout(timer);
    timer = null;

    store().resetForDevice(trimmed);
    await AsyncStorage.setItem(DEVICE_STORAGE_KEY, trimmed).catch(() => undefined);
    await AsyncStorage.setItem(MODE_STORAGE_KEY, 'normal').catch(() => undefined);

    await notificationService.reRegisterToken(trimmed).catch(() => undefined);

    if (running) {
      await tick();
      scheduleNext();
    }
  },

  stop(): void {
    running = false;
    if (timer) clearTimeout(timer);
    timer = null;
    appStateSub?.remove();
    appStateSub = null;
  },

  /** User says "false alarm" — tell the backend, return to normal mode. */
  async deactivateTheft(): Promise<void> {
    await api.deactivateTheft(); // throws on failure; caller surfaces the error
    store().setMode('normal');
    store().resetTrail();
    await AsyncStorage.setItem(MODE_STORAGE_KEY, 'normal').catch(() => undefined);
    await tick();
    scheduleNext();
  },

  /** Handles incoming push theft alert (foreground or background). */
  async handleTheftAlert(title?: string, body?: string): Promise<void> {
    if (store().mode !== 'theft') {
      store().setMode('theft');
      await AsyncStorage.setItem(MODE_STORAGE_KEY, 'theft').catch(() => undefined);
    }
    if (title || body) {
      await notificationService
        .displayPushAlert(
          title || 'Possible theft detected',
          body || 'Your car may be stolen. Tap to track it live.',
        )
        .catch(() => undefined);
    }
    await tick();
    scheduleNext();
  },

  /** Dev helper: ask the mock backend to flag the car as stolen. */
  async simulateTheftAlert(): Promise<void> {
    await api.triggerTheft();
    await tick(); // the status poll observes theftMode=true and activates theft mode
  },
};
