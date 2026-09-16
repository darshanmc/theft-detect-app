/**
 * Central app configuration.
 *
 * During USB development, `npm run android:device` forwards the phone's port
 * 3000 to the host machine with adb reverse. This lets a physical Android
 * device reach the local mock server through localhost without hard-coding a
 * machine-specific Wi-Fi address.
 *
 * To point the app at the real backend later, change API_BASE_URL only.
 */
import { NativeModules } from 'react-native';

export interface RapidConfig {
  apiBaseUrl?: string;
  deviceId?: string;
}

const rapidConfig = NativeModules.RapidConfig as RapidConfig | undefined;

export function resolveRapidConfig(config?: RapidConfig) {
  return {
    apiBaseUrl: config?.apiBaseUrl?.trim() || 'http://localhost:3000/api',
    deviceId: config?.deviceId?.trim() || '',
  };
}

const resolvedConfig = resolveRapidConfig(rapidConfig);

/**
 * Pass -PrapidApiBaseUrl=https://.../dev/v1 to the Android Gradle build to
 * target AWS. The empty default preserves the existing USB/mock workflow.
 */
export const API_BASE_URL = resolvedConfig.apiBaseUrl;

/** Optional default device ID provided by build or empty. */
export const DEFAULT_DEVICE_ID = resolvedConfig.deviceId;
export const DEVICE_ID = resolvedConfig.deviceId;

/** Storage key for persisted device ID. */
export const DEVICE_STORAGE_KEY = 'car-tracker.device_id';

/** Poll cadence while everything is normal. */
export const NORMAL_POLL_MS = 60_000;

/** Poll cadence while theft mode is active. */
export const THEFT_POLL_MS = 5_000;
