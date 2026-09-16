import {
  locationTime,
  markerRotation,
  readingAge,
} from '../src/utils/locationPresentation';

const timestamp = Date.parse('2026-09-16T10:00:00Z');

describe('location reading presentation', () => {
  it.each([
    [0, 'less than a minute'],
    [59, 'less than a minute'],
    [60, '1 minute'],
    [120, '2 minutes'],
    [3599, '59 minutes'],
    [3600, '1 hour'],
    [7200, '2 hours'],
    [86399, '23 hours'],
    [86400, '1 day'],
    [172800, '2 days'],
  ])('formats a %s second old reading', (seconds, age) => {
    expect(readingAge(timestamp, timestamp + seconds * 1000)).toBe(
      `Location received ${age} ago`,
    );
  });

  it('handles invalid and future timestamps explicitly', () => {
    expect(locationTime('bad date')).toBeNull();
    expect(readingAge(null, timestamp)).toBe('Location time unavailable');
    expect(readingAge(timestamp + 1000, timestamp)).toBe(
      'Location time is ahead of this phone',
    );
  });

  it.each([0, 90, 180, 270])(
    'orients heading %s relative to the map',
    heading => {
      expect(markerRotation(heading, 0)).toBe(heading);
      expect(markerRotation(heading, 90)).toBe((heading + 270) % 360);
    },
  );
});
