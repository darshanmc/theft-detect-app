import { api, ApiError } from '../src/api/client';
import { API_BASE_URL, DEVICE_ID } from '../src/config';

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => mockFetch.mockReset());

describe('api client', () => {
  it('fetches status from the device status endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ deviceId: DEVICE_ID, theftMode: false }),
    });

    const status = await api.getStatus();

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/devices/${DEVICE_ID}/status`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(status.deviceId).toBe(DEVICE_ID);
  });

  it('fetches location from the device location endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ deviceId: DEVICE_ID, lat: 1, lng: 2 }),
    });

    await api.getLocation();

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/devices/${DEVICE_ID}/location`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('POSTs to the theft endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ deviceId: DEVICE_ID, theftMode: true }),
    });

    await api.triggerTheft();

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/devices/${DEVICE_ID}/theft`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('POSTs to the push-token endpoint to register device token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, deviceId: DEVICE_ID, registered: true }),
    });

    const res = await api.registerPushToken('sample-fcm-token-123', 'android');

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/devices/${DEVICE_ID}/push-token`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'sample-fcm-token-123', platform: 'android' }),
      }),
    );
    expect(res.ok).toBe(true);
    expect(res.registered).toBe(true);
  });

  it('POSTs to the deactivate endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ theftMode: false }),
    });

    await api.deactivateTheft();

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/devices/${DEVICE_ID}/theft/deactivate`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws ApiError with the server message on failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "unknown device 'nope'" }),
    });

    await expect(api.getStatus()).rejects.toThrow(ApiError);
    await expect(api.getStatus()).rejects.toThrow("unknown device 'nope'");
  });

  it('preserves infrastructure conflict responses', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'device has no current location' }),
    });

    await expect(api.getStatus()).rejects.toMatchObject({
      status: 409,
      message: 'device has no current location',
    });
  });
});
