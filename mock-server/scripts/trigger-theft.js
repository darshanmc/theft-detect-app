/**
 * Simulates the ML backend flagging the car as stolen.
 * Usage: npm run trigger-theft   (mock server must be running)
 */
const PORT = process.env.PORT || 3000;
const DEVICE_ID = process.env.DEVICE_ID || 'car-001';

fetch(`http://localhost:${PORT}/api/devices/${DEVICE_ID}/theft`, { method: 'POST' })
  .then(async (res) => {
    const body = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(body));
    console.log(`Theft mode activated for ${body.deviceId} (theftMode=${body.theftMode})`);
  })
  .catch((err) => {
    console.error(`Failed to trigger theft: ${err.message}. Is the mock server running?`);
    process.exit(1);
  });
