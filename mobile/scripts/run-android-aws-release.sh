#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${RAPID_API_BASE_URL:-}" ]]; then
  echo "RAPID_API_BASE_URL is required (use Terraform mobile_api_base_url)." >&2
  exit 2
fi

RAPID_API_BASE_URL="${RAPID_API_BASE_URL%/}"
RAPID_DEVICE_EXTRA=""
if [[ -n "${RAPID_DEVICE_ID:-}" ]]; then
  RAPID_DEVICE_EXTRA="-PrapidDeviceId=$RAPID_DEVICE_ID"
fi

if [[ ! "$RAPID_API_BASE_URL" =~ ^https://.+/v1$ ]]; then
  echo "RAPID_API_BASE_URL must be an HTTPS URL ending in /v1." >&2
  exit 2
fi

if ! command -v adb >/dev/null 2>&1; then
  echo "adb is not available. Install Android SDK Platform Tools and add it to PATH." >&2
  exit 2
fi

if [[ -n "${ANDROID_SERIAL:-}" ]]; then
  serial="$ANDROID_SERIAL"
  if [[ "$(adb -s "$serial" get-state 2>/dev/null || true)" != "device" ]]; then
    echo "ANDROID_SERIAL '$serial' is not an authorized online device." >&2
    exit 2
  fi
else
  devices=()
  while read -r serial state; do
    if [[ "$state" == "device" ]]; then
      devices+=("$serial")
    fi
  done < <(adb devices | tail -n +2)

  if [[ "${#devices[@]}" -ne 1 ]]; then
    echo "Connect exactly one authorized Android phone, or set ANDROID_SERIAL." >&2
    adb devices -l >&2
    exit 2
  fi

  serial="${devices[0]}"
  export ANDROID_SERIAL="$serial"
fi

echo "Building and installing standalone Release APK to device $serial..."
echo "Target backend: $RAPID_API_BASE_URL"
echo "Note: Metro is NOT required for this build."

exec npx react-native run-android \
  --mode=release \
  --active-arch-only \
  --device "$serial" \
  --extra-params "-PrapidApiBaseUrl=$RAPID_API_BASE_URL $RAPID_DEVICE_EXTRA"
