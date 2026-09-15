/**
 * Mock backend for the Car Tracker app.
 *
 * Simulates:
 *  - an IoT device reporting status on a configurable cadence (real world: 1 hour)
 *  - the ML backend flagging the car as stolen  (POST /api/devices/:id/theft)
 *  - theft mode, where the device reports every 30s (real world cadence)
 *
 * Defaults are sped up (30s normal / 5s theft) so demos and testing are usable.
 * Override with env vars: NORMAL_TICK_MS / THEFT_TICK_MS (e.g. 3600000 / 30000 for real cadence).
 */
const express = require('express');

const PORT = Number(process.env.PORT || 3000);
const NORMAL_TICK_MS = Number(process.env.NORMAL_TICK_MS || 30_000);
const THEFT_TICK_MS = Number(process.env.THEFT_TICK_MS || 5_000);

// ---------------------------------------------------------------------------
// Simulated device state (downtown San Francisco, random-walk "driving")
// ---------------------------------------------------------------------------
const device = {
  id: process.env.DEVICE_ID || 'car-001',
  theftMode: false,
  lat: 37.7749,
  lng: -122.4194,
  headingDeg: 45,
  speedKmh: 0,
  batteryPct: 87,
  updatedAt: new Date().toISOString(),
};

const currentTickMs = () => (device.theftMode ? THEFT_TICK_MS : NORMAL_TICK_MS);

function advance() {
  // Random walk biased to keep a fairly steady heading, so it looks like driving.
  device.headingDeg = (device.headingDeg + (Math.random() - 0.5) * 50 + 360) % 360;
  device.speedKmh = device.theftMode ? 40 + Math.random() * 40 : 15 + Math.random() * 25;
  const meters = (device.speedKmh * 1000 * currentTickMs()) / 3_600_000;
  const rad = (device.headingDeg * Math.PI) / 180;
  device.lat += (meters * Math.cos(rad)) / 111_320;
  device.lng += (meters * Math.sin(rad)) / (111_320 * Math.cos((device.lat * Math.PI) / 180));
  device.batteryPct = Math.max(5, device.batteryPct - 0.02);
  device.updatedAt = new Date().toISOString();
}

let timer = null;
function scheduleNextTick() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    advance();
    scheduleNextTick();
  }, currentTickMs());
}
scheduleNextTick();

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
const locationPayload = () => ({
  deviceId: device.id,
  lat: device.lat,
  lng: device.lng,
  headingDeg: Math.round(device.headingDeg),
  speedKmh: Math.round(device.speedKmh * 10) / 10,
  updatedAt: device.updatedAt,
});

const statusPayload = () => ({
  ...locationPayload(),
  theftMode: device.theftMode,
  batteryPct: Math.round(device.batteryPct),
});

const app = express();
app.use(express.json());

/** Resolves :id against the simulated device; sends 404 and returns null if unknown. */
function findDevice(req, res) {
  if (req.params.id !== device.id) {
    res.status(404).json({ error: `unknown device '${req.params.id}'` });
    return null;
  }
  return device;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

/** Latest device status (location + theft flag). App polls this in normal mode. */
app.get('/api/devices/:id/status', (req, res) => {
  if (findDevice(req, res)) res.json(statusPayload());
});

/** Latest device location. App polls this every 30s in theft mode. */
app.get('/api/devices/:id/location', (req, res) => {
  if (findDevice(req, res)) res.json(locationPayload());
});

/** Simulate the ML model flagging the car as stolen. Idempotent. */
app.post('/api/devices/:id/theft', (req, res) => {
  if (!findDevice(req, res)) return;
  if (!device.theftMode) {
    device.theftMode = true;
    device.updatedAt = new Date().toISOString();
    console.log(`[mock] THEFT MODE ACTIVATED for ${device.id}`);
    scheduleNextTick(); // switch to fast reporting cadence
  }
  res.json(statusPayload());
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
  if (!findDevice(req, res)) return;
  if (device.theftMode) {
    device.theftMode = false;
    device.updatedAt = new Date().toISOString();
    console.log(`[mock] theft mode deactivated (false alarm) for ${device.id}`);
    scheduleNextTick(); // back to slow reporting cadence
  }
  res.json(statusPayload());
});

app.listen(PORT, () => {
  console.log(`[mock] car-tracker mock backend listening on http://localhost:${PORT}`);
  console.log(`[mock] device '${device.id}' | normal tick ${NORMAL_TICK_MS}ms | theft tick ${THEFT_TICK_MS}ms`);
});
