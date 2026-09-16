import { NORMAL_POLL_MS, THEFT_POLL_MS, resolveRapidConfig } from '../src/config';

describe('runtime configuration', () => {
  it('uses the local USB mock defaults when native values are absent', () => {
    expect(resolveRapidConfig()).toEqual({
      apiBaseUrl: 'http://localhost:3000/api',
      deviceId: '',
    });
  });

  it('uses trimmed Android build values for an AWS build', () => {
    expect(
      resolveRapidConfig({
        apiBaseUrl: ' https://example.execute-api.us-east-1.amazonaws.com/dev/v1 ',
        deviceId: ' car-001 ',
      }),
    ).toEqual({
      apiBaseUrl: 'https://example.execute-api.us-east-1.amazonaws.com/dev/v1',
      deviceId: 'car-001',
    });
  });

  it('falls back when Android provides empty build values', () => {
    expect(resolveRapidConfig({ apiBaseUrl: ' ', deviceId: '' })).toEqual({
      apiBaseUrl: 'http://localhost:3000/api',
      deviceId: '',
    });
  });

  it('keeps normal polling at 60s and theft polling at 5s', () => {
    expect(NORMAL_POLL_MS).toBe(60_000);
    expect(THEFT_POLL_MS).toBe(5_000);
  });
});
