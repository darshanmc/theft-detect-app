/**
 * Mock backend for the Car Tracker app.
 *
 * Simulates:
 *  - an IoT device reporting status on a configurable cadence (real world: 1 hour)
 *  - the ML backend flagging the car as stolen  (POST /api/devices/:id/theft)
 *  - theft mode, where the demo device reports every 5s by default
 *
 * Defaults are sped up (30s normal / 5s theft) so demos and testing are usable.
 * Override with env vars: NORMAL_TICK_MS / THEFT_TICK_MS (e.g. 3600000 / 30000 for real cadence).
 */
const express = require('express');

const PORT = Number(process.env.PORT || 3000);
const NORMAL_TICK_MS = Number(process.env.NORMAL_TICK_MS || 30_000);
const THEFT_TICK_MS = Number(process.env.THEFT_TICK_MS || 5_000);

// ---------------------------------------------------------------------------
// Simulated device state map (supports any requested device dynamically)
// ---------------------------------------------------------------------------
const devices = new Map();

function getOrCreateDevice(deviceId) {
  const id = deviceId || 'car-001';
  if (!devices.has(id)) {
    devices.set(id, {
      id,
      theftMode: false,
      lat: 37.7749 + (Math.random() - 0.5) * 0.02,
      lng: -122.4194 + (Math.random() - 0.5) * 0.02,
      headingDeg: 45,
      speedKmh: 0,
      batteryPct: 87,
      updatedAt: new Date().toISOString(),
    });
  }
  return devices.get(id);
}

// Seed default devices
getOrCreateDevice('car-001');
getOrCreateDevice('KRG0523-59730797');

function advance() {
  for (const device of devices.values()) {
    const tickMs = device.theftMode ? THEFT_TICK_MS : NORMAL_TICK_MS;
    device.headingDeg = (device.headingDeg + (Math.random() - 0.5) * 50 + 360) % 360;
    device.speedKmh = device.theftMode ? 40 + Math.random() * 40 : 15 + Math.random() * 25;
    const meters = (device.speedKmh * 1000 * tickMs) / 3_600_000;
    const rad = (device.headingDeg * Math.PI) / 180;
    device.lat += (meters * Math.cos(rad)) / 111_320;
    device.lng += (meters * Math.sin(rad)) / (111_320 * Math.cos((device.lat * Math.PI) / 180));
    device.batteryPct = Math.max(5, device.batteryPct - 0.02);
    device.updatedAt = new Date().toISOString();
  }
}

let timer = null;
function scheduleNextTick() {
  clearTimeout(timer);
  const anyTheft = Array.from(devices.values()).some((d) => d.theftMode);
  const nextMs = anyTheft ? THEFT_TICK_MS : NORMAL_TICK_MS;
  timer = setTimeout(() => {
    advance();
    scheduleNextTick();
  }, nextMs);
}
scheduleNextTick();

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
const locationPayload = (device) => ({
  deviceId: device.id,
  lat: device.lat,
  lng: device.lng,
  headingDeg: Math.round(device.headingDeg),
  speedKmh: Math.round(device.speedKmh * 10) / 10,
  updatedAt: device.updatedAt,
});

const statusPayload = (device) => ({
  ...locationPayload(device),
  theftMode: device.theftMode,
  batteryPct: Math.round(device.batteryPct),
});

const app = express();
app.use(express.json());

/** Resolves :id against simulated devices; dynamically provisions if unknown. */
function findDevice(req, _res) {
  const deviceId = req.params.id;
  return getOrCreateDevice(deviceId);
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

/** Latest device status (location + theft flag). App polls this in normal mode. */
app.get('/api/devices/:id/status', (req, res) => {
  const device = findDevice(req, res);
  if (device) res.json(statusPayload(device));
});

/** Latest device location. App polls this every 5s in theft mode. */
app.get('/api/devices/:id/location', (req, res) => {
  const device = findDevice(req, res);
  if (device) res.json(locationPayload(device));
});

/** Simulate the ML model flagging the car as stolen. Idempotent. */
app.post('/api/devices/:id/theft', (req, res) => {
  const device = findDevice(req, res);
  if (!device) return;
  if (!device.theftMode) {
    device.theftMode = true;
    device.updatedAt = new Date().toISOString();
    console.log(`[mock] THEFT MODE ACTIVATED for ${device.id}`);
    scheduleNextTick(); // switch to fast reporting cadence
  }
  res.json(statusPayload(device));
});

/** Register device push notification token (mock). */
app.post('/api/devices/:id/push-token', (req, res) => {
  const d = findDevice(req, res);
  if (!d) return;
  const { token, platform = 'android' } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'push token is required' });
  }
  d.pushToken = token;
  d.pushPlatform = platform;
  d.pushTokenUpdatedAt = new Date().toISOString();
  console.log(`[mock] registered push token for ${d.id}: ${token.slice(0, 16)}...`);
  res.json({ ok: true, deviceId: d.id, registered: true });
});

/** False alarm — deactivate theft mode. Idempotent. */
app.post('/api/devices/:id/theft/deactivate', (req, res) => {
  const device = findDevice(req, res);
  if (!device) return;
  if (device.theftMode) {
    device.theftMode = false;
    device.updatedAt = new Date().toISOString();
    console.log(`[mock] theft mode deactivated (false alarm) for ${device.id}`);
    scheduleNextTick();
  }
  res.json(statusPayload(device));
});

app.listen(PORT, () => {
  console.log(`[mock] car-tracker mock backend listening on http://localhost:${PORT}`);
  console.log(`[mock] multi-device support enabled | normal tick ${NORMAL_TICK_MS}ms | theft tick ${THEFT_TICK_MS}ms`);
});
