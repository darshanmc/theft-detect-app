/** Latest known location of a tracked device. */
export interface DeviceLocation {
  deviceId: string;
  lat: number;
  lng: number;
  headingDeg: number;
  speedKmh: number;
  /** ISO-8601 timestamp of when the device generated this reading. */
  updatedAt: string;
}

/** Full device status, as polled by the app in normal mode. */
export interface DeviceStatus extends DeviceLocation {
  theftMode: boolean;
  batteryPct: number;
}
