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
});
