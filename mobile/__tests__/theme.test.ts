import { colors } from '../src/theme';

function luminance(hex: string) {
  const channels = [1, 3, 5].map(offset => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

it.each([
  [colors.text, colors.canvas],
  [colors.text, colors.surface],
  [colors.muted, colors.canvas],
  [colors.muted, colors.surface],
  [colors.primary, colors.primarySoft],
  [colors.surface, colors.primary],
  [colors.surface, colors.alert],
  [colors.alert, colors.alertSoft],
  [colors.warning, colors.warningSoft],
])('meets 4.5:1 text contrast for %s on %s', (foreground, background) => {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  expect((light + 0.05) / (dark + 0.05)).toBeGreaterThanOrEqual(4.5);
});
