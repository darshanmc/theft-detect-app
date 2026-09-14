# Car Tracker

Asset (car) tracking app with theft mode.

- **IoT device** reports the car's location (hourly in production).
- **ML backend** decides whether the car is stolen and raises an alert.
- On a theft alert the app enters **theft mode**: the device reports every **30s**
  and the app shows the car moving on a map in near real time, until the user
  marks the alert as a false alarm.

In development, normal mode shows the car on an OpenStreetMap map; tapping
"Simulate theft alert" (or `npm run trigger-theft`) raises a local
notification, flips the app into theft mode (red banner, 30s polling, live
trail), and "Deactivate theft mode" returns it to normal.

```
car-tracker/
├── mobile/        # React Native app (Android-first, RN 0.87)
└── mock-server/   # Node/Express mock of the IoT + ML backend (port 3000)
```

## v1 scope decisions

| Topic | v1 choice | Upgrade path |
|---|---|---|
| Backend | local mock server | change `API_BASE_URL` in `mobile/src/config.ts` |
| Theft alert | simulated (poll + dev button → local notification) | implement the `NotificationService` interface with FCM |
| Live updates | REST polling every 30s (foreground) | WebSocket or FCM data messages |
| Maps | OpenStreetMap via `@maplibre/maplibre-react-native` (no API key) | proper tile provider for production |
| Auth | none, hardcoded device `car-001` | real login + device binding |

## Run it

Prereqs: Node 22.11+, JDK 17+, Android SDK Platform 37 with Platform Tools and
NDK 27.1.12297006, a physical Android 7.0+ device with USB debugging, and
`ANDROID_HOME` set.

```bash
# 1. mock backend (terminal 1)
cd mock-server && npm install && npm start

# 2. app (terminal 2)
cd mobile && npm install && npm run android:device
```

The device command uses `adb reverse` for Metro on port 8081 and the mock API
on port 3000. The phone must remain connected over USB while the app uses the
local backend. See `mobile/README.md` for setup and troubleshooting details.

To use the deployed AWS development API instead, export Terraform's
`mobile_api_base_url` and `mobile_demo_device_id` outputs and run:

```bash
cd mobile
RAPID_API_BASE_URL="https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/dev/v1" \
RAPID_DEVICE_ID="car-001" \
npm run android:aws-device
```

This mode forwards Metro port 8081 only; the phone reaches API Gateway directly
over HTTPS. The complete deployment checks and telemetry simulator command are
documented in `mobile/README.md`.

## Using the app

1. **Normal mode** — map shows the car's last known location; the app polls
   `/status` every 60s.
2. **Trigger a theft alert** (v1, simulated):
   - in the app: the dev-only **"Simulate theft alert"** button (top right), or
   - from a terminal: `cd mock-server && npm run trigger-theft` (the app picks
     it up on its next status poll, within 60s).
3. **Theft mode** — red banner, local notification, location polled every 30s,
   breadcrumb trail drawn on the map. The mode survives app restarts
   (AsyncStorage).
4. **False alarm** — tap **"Deactivate theft mode"** at the bottom and confirm;
   the app tells the backend and returns to normal mode.

## Mock backend API

Base URL: `http://localhost:3000`

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/devices/:id/status` | location + `theftMode` flag (app polls in normal mode) |
| GET | `/api/devices/:id/location` | latest location (app polls every 30s in theft mode) |
| POST | `/api/devices/:id/theft` | simulate ML verdict → activates theft mode |
| POST | `/api/devices/:id/theft/deactivate` | false alarm → back to normal |

Device cadence is configurable via env vars `NORMAL_TICK_MS` / `THEFT_TICK_MS`
(defaults `30000` / `5000`, sped up for demos; use `3600000` / `30000` for the
real cadence).

## Tests

```bash
cd mobile && npm test          # jest unit tests (store + api client)
cd mobile && npx tsc --noEmit  # typecheck
```

## Known limitations (v1)

- The app must be **open** to receive a theft alert (simulated alerts have no
  real push channel). Real FCM removes this.
- 30s polling pauses while the app is backgrounded; it refreshes on resume.
- OSM's public tile server is fine for dev/demo only (tile usage policy).
- No authentication; a single hardcoded device ID.
- New Architecture is currently disabled (`android/gradle.properties`
  `newArchEnabled=false`) for map stability on this emulator; re-enable and
  re-verify before shipping.
