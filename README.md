# Car Tracker

Asset (car) tracking app with theft mode.

- **IoT device** reports the car's location (hourly in production).
- **ML backend** decides whether the car is stolen and raises an alert.
- On a theft alert the app enters **theft mode**: it polls every **5s**
  and shows the car moving on a map in near real time, until the user
  marks the alert as a false alarm.

Normal mode pairs an OpenStreetMap map with a vehicle card showing the selected
tracker, reading age, full reading date/time, and last reported speed. A
heading-aware car marker replaces the old text label. Panning pauses map
following; the circular recenter control resumes it without resetting zoom.

In development, expand **Developer tools** in the vehicle card and tap
**Simulate theft alert** (or use `npm run trigger-theft`) to raise a local
notification and enter theft mode (red banner, 5s polling, breadcrumb
trail). **This is a false alarm** asks for confirmation before returning to
normal mode.

```
car-tracker/
├── mobile/        # React Native app (Android-first, RN 0.87)
└── mock-server/   # Node/Express mock of the IoT + ML backend (port 3000)
```

## v1 scope decisions

| Topic | v1 choice | Upgrade path |
|---|---|---|
| Backend | local mock server | change `API_BASE_URL` in `mobile/src/config.ts` |
| Theft alert | simulated alerts; AWS SNS/FCM push when configured | see mobile setup for Firebase configuration |
| Live updates | REST polling every 5s in theft mode (foreground) | WebSocket or FCM data messages |
| Maps | OpenStreetMap via `@maplibre/maplibre-react-native` (no API key) | proper tile provider for production |
| Auth | none; manually selected tracker ID, optionally seeded by build config | real login + device binding |

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

1. **Connect a tracker** — enter its device ID and connect after verification.
   Use **Change device** in the vehicle card to switch trackers. Demo presets
   and the verification bypass are available only in development builds.
2. **Normal mode** — map shows the car's last known location; the app polls
   `/status` every 60s. Drag to explore; use the recenter control to follow the
   car again. Reading age comes from the device timestamp, not the last API
   request: normal tracking does not mean the car is safe or the reading is fresh.
3. **Trigger a theft alert** (development):
   - in the app: **Developer tools > Simulate theft alert** in the vehicle card, or
   - from a terminal: `cd mock-server && npm run trigger-theft` (the app picks
     it up on its next status poll, within 60s).
4. **Theft mode** — red alert card, local notification, location polled every 5s,
   breadcrumb trail drawn on the map. The mode survives app restarts
   (AsyncStorage).
5. **False alarm** — tap **This is a false alarm** in the vehicle card and confirm;
   the app tells the backend and returns to normal mode.

The map appears only after a location is received. Connection failures show an
explicit warning and keep any last-known location visible while requests retry
automatically. The vehicle card scrolls when space or larger text requires it.

## Mock backend API

Base URL: `http://localhost:3000`

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/devices/:id/status` | location + `theftMode` flag (app polls in normal mode) |
| GET | `/api/devices/:id/location` | latest location (app polls every 5s in theft mode) |
| POST | `/api/devices/:id/push-token` | register device push token (FCM / SNS) |
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

- Simulated alerts require the app's polling loop; receiving real push alerts
  requires the Firebase/AWS configuration described in `mobile/README.md`.
- High-frequency tracking is intended for foreground use; background execution
  is OS-dependent. The app requests a new reading on resume.
- OSM's public tile server is fine for dev/demo only (tile usage policy).
- No authentication or ownership verification; only one selected tracker at a time.
- New Architecture is currently disabled (`android/gradle.properties`
  `newArchEnabled=false`) for map stability on this emulator; re-enable and
  re-verify before shipping.
