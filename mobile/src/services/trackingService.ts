import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NORMAL_POLL_MS, THEFT_POLL_MS } from '../config';
import { api } from '../api/client';
import type { DeviceStatus } from '../api/types';
import { useTrackingStore } from '../state/trackingStore';
import { notificationService } from './notificationService';

/**
 * Polls the backend and drives the tracking store.
 *
 *  - normal mode: polls /status every NORMAL_POLL_MS (location + theft flag)
 *  - theft mode:  polls /location every THEFT_POLL_MS (30s live tracking)
 *
 * The mode is persisted, so killing and reopening the app keeps tracking the car.
 */
const MODE_STORAGE_KEY = 'car-tracker.mode';

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let appStateSub: { remove: () => void } | null = null;

const store = () => useTrackingStore.getState();

async function tick(): Promise<void> {
  try {
    if (store().mode === 'theft') {
      store().setLocation(await api.getLocation());
    } else {
      const status = await api.getStatus();
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
  if (!running) return;
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
  /** Restore persisted mode and start the polling loop. Idempotent. */
  async start(): Promise<void> {
    if (running) return;
    running = true;

    const savedMode = await AsyncStorage.getItem(MODE_STORAGE_KEY).catch(() => null);
    if (savedMode === 'theft') {
      store().setMode('theft');
    }
    store().setHydrated(true);

    await tick();
    scheduleNext();

    // Refresh immediately whenever the app comes back to the foreground.
    appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
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

  /** Dev helper: ask the mock backend to flag the car as stolen. */
  async simulateTheftAlert(): Promise<void> {
    await api.triggerTheft();
    await tick(); // the status poll observes theftMode=true and activates theft mode
  },
};
