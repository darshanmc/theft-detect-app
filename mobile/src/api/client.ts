import { API_BASE_URL, DEFAULT_DEVICE_ID } from '../config';
import { useTrackingStore } from '../state/trackingStore';
import type { DeviceLocation, DeviceStatus, PushTokenRegistrationResponse } from './types';

const REQUEST_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function resolveDeviceId(deviceId?: string): string {
  const id = deviceId?.trim() || useTrackingStore.getState().deviceId?.trim() || DEFAULT_DEVICE_ID;
  if (!id) {
    throw new ApiError(400, 'No device ID configured. Please enter a device ID.');
  }
  return encodeURIComponent(id);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await res.json().catch(() => undefined);
    if (!res.ok) {
      throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }
    return body as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Typed client for the tracking backend.
 */
export const api = {
  getStatus: (deviceId?: string) =>
    request<DeviceStatus>(`/devices/${resolveDeviceId(deviceId)}/status`),
  getLocation: (deviceId?: string) =>
    request<DeviceLocation>(`/devices/${resolveDeviceId(deviceId)}/location`),
  registerPushToken: (token: string, deviceId?: string, platform: string = 'android') =>
    request<PushTokenRegistrationResponse>(`/devices/${resolveDeviceId(deviceId)}/push-token`, {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    }),
  triggerTheft: (deviceId?: string) =>
    request<DeviceStatus>(`/devices/${resolveDeviceId(deviceId)}/theft`, { method: 'POST' }),
  deactivateTheft: (deviceId?: string) =>
    request<DeviceStatus>(`/devices/${resolveDeviceId(deviceId)}/theft/deactivate`, { method: 'POST' }),
};
