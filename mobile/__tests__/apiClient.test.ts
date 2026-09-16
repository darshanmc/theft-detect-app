import { api, ApiError } from '../src/api/client';
import { API_BASE_URL } from '../src/config';
import { useTrackingStore } from '../src/state/trackingStore';

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  mockFetch.mockReset();
  useTrackingStore.setState({
    deviceId: 'car-001',
    mode: 'normal',
    lastLocation: null,
    trail: [],
    lastError: null,
    hydrated: true,
    deviceModalVisible: false,
  });
});

describe('api client', () => {
  it('fetches status using active store deviceId', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ deviceId: 'car-001', theftMode: false }),
    });

    const status = await api.getStatus();

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/devices/car-001/status`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(status.deviceId).toBe('car-001');
  });

  it('fetches status with explicitly passed device ID', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ deviceId: 'KRG0523-59730797', theftMode: false }),
    });

    const status = await api.getStatus('KRG0523-59730797');

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/devices/KRG0523-59730797/status`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(status.deviceId).toBe('KRG0523-59730797');
  });

  it('fetches location from the device location endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ deviceId: 'car-001', lat: 1, lng: 2 }),
    });

    await api.getLocation();

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/devices/car-001/location`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('POSTs to the theft endpoint with specified device ID', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ deviceId: 'dev-999', theftMode: true }),
    });

    await api.triggerTheft('dev-999');

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/devices/dev-999/theft`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('POSTs to the push-token endpoint to register device token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, deviceId: 'car-001', registered: true }),
    });

    const res = await api.registerPushToken('sample-fcm-token-123', 'car-001', 'android');

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/devices/car-001/push-token`,
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
      `${API_BASE_URL}/devices/car-001/theft/deactivate`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws error when no device ID is available', () => {
    useTrackingStore.setState({ deviceId: null });

    expect(() => api.getStatus()).toThrow(ApiError);
    expect(() => api.getStatus()).toThrow('No device ID configured');
  });

  it('throws ApiError with the server message on failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "unknown device 'nope'" }),
    });

    await expect(api.getStatus('nope')).rejects.toThrow(ApiError);
    await expect(api.getStatus('nope')).rejects.toThrow("unknown device 'nope'");
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
