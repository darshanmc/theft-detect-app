export function locationTime(updatedAt: string): number | null {
  const value = Date.parse(updatedAt);
  return Number.isFinite(value) ? value : null;
}

export function readingAge(timestamp: number | null, now: number): string {
  if (timestamp === null) return 'Location time unavailable';
  if (timestamp > now) return 'Location time is ahead of this phone';
  const seconds = Math.floor((now - timestamp) / 1000);
  if (seconds < 60) return 'Location received less than a minute ago';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `Location received ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Location received ${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(hours / 24);
  return `Location received ${days} day${days === 1 ? '' : 's'} ago`;
}

export function markerRotation(
  heading: number,
  bearing: number,
): number | null {
  if (!Number.isFinite(heading) || !Number.isFinite(bearing)) return null;
  return (((heading - bearing) % 360) + 360) % 360;
}
