# Car Tracker

Asset (car) tracking app with theft mode.

- **IoT device** reports the car's location (hourly in production).
- **ML backend** decides whether the car is stolen and raises an alert.
- On a theft alert the app enters **theft mode**: the device reports every **30s**
  and the app shows the car moving on a map in near real time, until the user
  marks the alert as a false alarm.

Verified working on the Android emulator: normal mode shows the car on an
OpenStreetMap map; tapping "Simulate theft alert" (or `npm run trigger-theft`)
raises a local notification, flips the app into theft mode (red banner, 30s
polling, live trail), and "Deactivate theft mode" returns it to normal.

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

Prereqs: Node, JDK 17+, Android SDK with an emulator or a device with USB
debugging, and `ANDROID_HOME` set.

```bash
# 1. mock backend (terminal 1)
cd mock-server && npm install && npm start

# 2. app (terminal 2)
cd mobile && npm install && adb reverse tcp:8081 tcp:8081 && npm run android
```

The Android emulator reaches the mock server via `10.0.2.2` (already the
default in `mobile/src/config.ts`). For a physical device, set `API_BASE_URL`
to your computer's LAN IP.

> Emulator DNS can be flaky. If the map stays blank and logcat shows
> `Unable to resolve host "tile.openstreetmap.org"`, restart the emulator with
> `emulator -avd <name> -dns-server 8.8.8.8,1.1.1.1`.

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
