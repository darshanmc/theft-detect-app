# Car Tracker mobile app

React Native Android app for viewing the tracked car, receiving simulated
theft alerts, and following the car's movement while theft mode is active.

## What a physical Android phone needs

- Android 7.0 or newer (the app's minimum SDK is 24)
- Developer options and USB debugging enabled
- A USB data cable and an authorized `adb` connection
- Internet access on the phone for OpenStreetMap tiles

The development computer needs:

- Node.js 22.11 or newer
- JDK 17 or newer
- Android SDK Platform 37, Build Tools 37.0.0, Platform Tools, and NDK
  27.1.12297006
- `ANDROID_HOME` configured and `adb` available on `PATH`

## Run on a phone over USB

From `theft-detect-app`:

```bash
# Terminal 1: install and start the mock API.
cd mock-server
npm install
npm start
```

Connect and unlock the phone, accept its USB debugging prompt, then verify it
is visible:

```bash
adb devices -l
```

The device must be listed as `device`, not `unauthorized` or `offline`.

In another terminal:

```bash
cd mobile
npm install
npm run android:device
```

`android:device` forwards port 8081 for Metro and port 3000 for the mock API,
builds the debug app, installs it on the connected phone, and launches it.
Keep the USB cable connected while using this local development setup.

If Metro is already running, leave it running and use the same command. If the
app cannot load JavaScript or reports that the backend is unreachable, restore
the forwards:

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
adb reverse --list
```

## Exercise the app

1. Allow notifications when Android asks.
2. Confirm that the map and the simulated car appear.
3. Tap **Simulate theft alert** in the top-right corner.
4. Confirm the theft notification, red theft-mode banner, and route trail.
5. Tap **Deactivate theft mode** to return to normal mode.

The displayed location is supplied by the mock server; it is not the phone's
GPS location. No Android location permission is required.

## Build an installable debug APK

The normal device command installs directly through `adb`. To produce an APK
that can be copied to this phone:

```bash
cd android
./gradlew assembleDebug
```

The APK is written to:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

This debug APK still expects the mock API at `localhost:3000`, so establish the
port 3000 reverse before using it. A standalone production APK needs a deployed
HTTPS backend URL, production signing, authentication, push notifications, and
a production map tile provider.

## Build against the AWS development API

The deployed `rapid/origin/dev` infrastructure must have:

- `enable_mobile_test_api = true`
- Kinesis ingest enabled
- the seeded mobile demo device (currently `car-001`)

Obtain the deployed values from the Terraform layer:

```bash
cd rapid/infrastructure/aws
terraform output -raw mobile_api_base_url
terraform output -raw mobile_demo_device_id
```

Before installing the app, verify the deployed contract:

```bash
export RAPID_API_BASE_URL="$(terraform output -raw mobile_api_base_url)"
export RAPID_DEVICE_ID="$(terraform output -raw mobile_demo_device_id)"

curl --fail "$RAPID_API_BASE_URL/devices/$RAPID_DEVICE_ID/status"
curl --fail "$RAPID_API_BASE_URL/devices/$RAPID_DEVICE_ID/location"
```

Connect and unlock one physical phone, accept its USB debugging prompt, and
check that `adb devices -l` lists it as `device`. If more than one Android
device is connected, export its serial as `ANDROID_SERIAL`.

Start Metro from the mobile directory:

```bash
cd theft-detect-app/mobile
npm start
```

In another terminal, export the same AWS values and install the app:

```bash
cd theft-detect-app/mobile
export RAPID_API_BASE_URL="https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/dev/v1"
export RAPID_DEVICE_ID="car-001"
npm run android:aws-device
```

The AWS command rejects emulators, forwards only Metro port 8081, injects the
API URL and device ID into the Android build, installs it, and launches it.
The phone calls API Gateway directly over HTTPS; do not reverse port 3000.

Send changing GPS readings from the infrastructure project:

```bash
cd rapid/infrastructure/aws/lambda
python3 simulate_mobile_telemetry.py \
  --api-base-url "$RAPID_API_BASE_URL" \
  --device-id "$RAPID_DEVICE_ID"
```

Confirm that the marker and theft-mode trail move, then use **Simulate theft
alert** and **Deactivate theft mode** to test the development-only lifecycle.

The theft notification is generated locally after foreground polling observes
the AWS status. SNS email is not Android push, so this development build does
not receive theft alerts while the app is fully closed.

## Useful checks

```bash
npm test -- --runInBand
npx tsc --noEmit
npm run lint
```
