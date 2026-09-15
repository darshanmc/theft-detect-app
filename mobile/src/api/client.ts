import { API_BASE_URL, DEVICE_ID } from '../config';
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
 * Typed client for the tracking backend. Swap the implementation (or just
 * API_BASE_URL in config.ts) to go from the mock server to the real backend.
 */
export const api = {
  getStatus: () => request<DeviceStatus>(`/devices/${DEVICE_ID}/status`),
  getLocation: () => request<DeviceLocation>(`/devices/${DEVICE_ID}/location`),
  registerPushToken: (token: string, platform: string = 'android') =>
    request<PushTokenRegistrationResponse>(`/devices/${DEVICE_ID}/push-token`, {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    }),
  triggerTheft: () =>
    request<DeviceStatus>(`/devices/${DEVICE_ID}/theft`, { method: 'POST' }),
  deactivateTheft: () =>
    request<DeviceStatus>(`/devices/${DEVICE_ID}/theft/deactivate`, { method: 'POST' }),
};
