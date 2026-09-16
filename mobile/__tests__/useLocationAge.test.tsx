import React from 'react';
import { AppState, Text, type AppStateStatus } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useLocationAge } from '../src/hooks/useLocationAge';

function Reading({ updatedAt }: { updatedAt: string }) {
  const { age, absoluteTime } = useLocationAge(updatedAt);
  return (
    <Text>
      {age} / {absoluteTime}
    </Text>
  );
}

let renderer: ReactTestRenderer;
let onState: (state: AppStateStatus) => void;
const remove = jest.fn();
const initialState = AppState.currentState;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-16T10:00:00Z'));
  AppState.currentState = 'active';
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_type, callback) => {
      onState = callback;
      return { remove };
    });
});

afterEach(() => {
  act(() => renderer?.unmount());
  jest.restoreAllMocks();
  AppState.currentState = initialState;
  jest.useRealTimers();
  remove.mockClear();
});

it('ages identical readings without another backend response', () => {
  act(() => {
    renderer = create(<Reading updatedAt="2026-09-16T10:00:00Z" />);
  });
  act(() => jest.advanceTimersByTime(60_000));
  expect(JSON.stringify(renderer.toJSON())).toContain('1 minute ago');
  act(() => renderer.update(<Reading updatedAt="2026-09-16T10:00:00Z" />));
  act(() => jest.advanceTimersByTime(60_000));
  expect(JSON.stringify(renderer.toJSON())).toContain('2 minutes ago');
});

it('pauses its timer in background, refreshes on resume, and cleans up', () => {
  act(() => {
    renderer = create(<Reading updatedAt="2026-09-16T10:00:00Z" />);
  });
  act(() => onState('background'));
  expect(jest.getTimerCount()).toBe(0);
  jest.setSystemTime(new Date('2026-09-17T10:00:00Z'));
  act(() => onState('active'));
  expect(JSON.stringify(renderer.toJSON())).toContain('1 day ago');
  expect(jest.getTimerCount()).toBe(1);
  act(() => renderer.unmount());
  expect(jest.getTimerCount()).toBe(0);
  expect(remove).toHaveBeenCalled();
});

it('warns on invalid time without starting a timer or displaying Invalid Date', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  act(() => {
    renderer = create(<Reading updatedAt="invalid" />);
  });
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Location time unavailable',
  );
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Invalid Date');
  expect(warn).toHaveBeenCalledWith(
    'Location reading has an invalid timestamp',
    'invalid',
  );
  expect(jest.getTimerCount()).toBe(0);
});
