/**
 * Central app configuration.
 *
 * The app talks to the backend over plain HTTP. During development against the
 * mock server:
 *  - the Android emulator reaches the host machine via 10.0.2.2
 *  - a physical device on the same Wi-Fi should use your machine's LAN IP,
 *    e.g. http://192.168.1.42:3000/api
 *
 * To point the app at the real backend later, change API_BASE_URL only.
 */
export const API_BASE_URL = 'http://10.0.2.2:3000/api';

/** The single tracked device (no auth in v1). */
export const DEVICE_ID = 'car-001';

/** Poll cadence while everything is normal. */
export const NORMAL_POLL_MS = 60_000;

/** Poll cadence while theft mode is active (device reports every 30s). */
export const THEFT_POLL_MS = 30_000;
