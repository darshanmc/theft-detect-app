import React from 'react';
import { KeyboardAvoidingView, Modal, StyleSheet, Text, TextInput } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { DeviceSelectionModal } from '../src/components/DeviceSelectionModal';
import { api, ApiError } from '../src/api/client';
import { trackingService } from '../src/services/trackingService';
import { useTrackingStore } from '../src/state/trackingStore';
import { colors } from '../src/theme';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
jest.mock('../src/api/client', () => ({
  api: { getStatus: jest.fn() },
  ApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));
jest.mock('../src/services/trackingService', () => ({
  trackingService: { setDevice: jest.fn() },
}));

const getStatus = jest.mocked(api.getStatus);
const setDevice = jest.mocked(trackingService.setDevice);
const bypassLabel = 'Connect without verification (development only)';
let renderer: ReactTestRenderer;
let warning: jest.SpyInstance;
const originalDev = __DEV__;

function button(label: string) {
  return buttons().find(
    node => node.props.accessibilityLabel === label,
  )!;
}

function buttons() {
  return renderer.root.findAll(
    node => node.props.accessibilityRole === 'button' &&
      typeof node.props.onPress === 'function',
  );
}

function input() {
  return renderer.root.findByType(TextInput);
}

function text() {
  return renderer.root.findAllByType(Text).map(node => node.props.children).join(' ');
}

async function render() {
  await act(async () => {
    renderer = create(<DeviceSelectionModal />);
  });
}

async function enter(id: string) {
  await act(async () => input().props.onChangeText(id));
}

async function press(label: string) {
  await act(async () => button(label).props.onPress());
}

beforeEach(() => {
  Object.assign(globalThis, { __DEV__: true });
  jest.clearAllMocks();
  warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  getStatus.mockResolvedValue({} as Awaited<ReturnType<typeof api.getStatus>>);
  setDevice.mockImplementation(async id => {
    useTrackingStore.getState().resetForDevice(id);
  });
  useTrackingStore.setState({
    deviceId: null,
    hydrated: true,
    deviceModalVisible: false,
  });
});

afterEach(async () => {
  await act(async () => renderer?.unmount());
  warning.mockRestore();
  Object.assign(globalThis, { __DEV__: originalDev });
});

it('uses the shared light palette and requests a light keyboard', async () => {
  await render();
  expect(input().props.keyboardAppearance).toBe('light');
  expect(input().props.placeholderTextColor).toBe(colors.muted);
  expect(StyleSheet.flatten(input().props.style)).toMatchObject({
    backgroundColor: colors.canvas,
    color: colors.text,
    borderColor: colors.border,
  });
  expect(StyleSheet.flatten(
    renderer.root.findByType(KeyboardAvoidingView).props.style,
  ).backgroundColor).toBe(colors.canvas);
});

it('verifies the trimmed tracker ID before saving and closing required setup', async () => {
  await render();
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
  expect(button('Cancel switching tracker')).toBeUndefined();
  await act(async () => renderer.root.findByType(Modal).props.onRequestClose());
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
  await enter('  owner-tracker  ');
  await press('Connect tracker');
  expect(getStatus).toHaveBeenCalledWith('owner-tracker');
  expect(setDevice).toHaveBeenCalledWith('owner-tracker');
  expect(getStatus.mock.invocationCallOrder[0]).toBeLessThan(
    setDevice.mock.invocationCallOrder[0],
  );
  expect(renderer.root.findByType(Modal).props.visible).toBe(false);
});

it('keeps an unknown tracker open with owner-friendly copy and logs the failure', async () => {
  const error = new ApiError(404, 'DynamoDB internal details');
  getStatus.mockRejectedValueOnce(error);
  await render();
  await enter('unknown');
  await press('Connect tracker');
  expect(setDevice).not.toHaveBeenCalled();
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
  expect(text()).toContain('We couldn’t find that tracker.');
  expect(text()).not.toContain('DynamoDB');
  expect(warning).toHaveBeenCalledWith(
    '[DeviceSelectionModal] Tracker connection failed', error,
  );
});

it('does not expose technical connection errors', async () => {
  const error = new Error('Private endpoint timed out');
  getStatus.mockRejectedValueOnce(error);
  await render();
  await enter('owner-tracker');
  await press('Connect tracker');
  expect(text()).toContain('Check your internet connection and try again.');
  expect(text()).not.toContain(error.message);
  expect(warning).toHaveBeenCalledWith(expect.any(String), error);
});

it('allows cancelling a switch without changing the selected tracker', async () => {
  useTrackingStore.setState({ deviceId: 'current', deviceModalVisible: true });
  await render();
  await enter('replacement');
  await press('Cancel switching tracker');
  expect(useTrackingStore.getState().deviceId).toBe('current');
  expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  expect(getStatus).not.toHaveBeenCalled();
  expect(setDevice).not.toHaveBeenCalled();
});

it('blocks duplicate submissions, editing, presets, bypass and cancellation while loading', async () => {
  let resolveStatus!: (status: Awaited<ReturnType<typeof api.getStatus>>) => void;
  getStatus.mockImplementationOnce(() => new Promise(resolve => {
    resolveStatus = resolve;
  }));
  useTrackingStore.setState({ deviceId: 'current', deviceModalVisible: true });
  await render();
  await enter('replacement');
  const connect = button('Switch tracker').props.onPress;
  const preset = button('Use test tracker car-001').props.onPress;
  const bypass = button(bypassLabel).props.onPress;
  const cancel = button('Cancel switching tracker').props.onPress;
  let pending: Promise<void>;
  await act(async () => {
    pending = connect();
    connect();
    preset();
    bypass();
    cancel();
  });
  expect(getStatus).toHaveBeenCalledTimes(1);
  expect(setDevice).not.toHaveBeenCalled();
  expect(input().props.value).toBe('replacement');
  expect(input().props.editable).toBe(false);
  expect(buttons()).toHaveLength(5);
  for (const node of buttons()) {
    expect(node.props.disabled).toBe(true);
    expect(node.props.accessibilityState.disabled).toBe(true);
  }
  expect(button('Switch tracker').props.accessibilityState.busy).toBe(true);
  await act(async () => {
    input().props.onChangeText('changed');
    renderer.root.findByType(Modal).props.onRequestClose();
  });
  expect(input().props.value).toBe('replacement');
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
  await act(async () => {
    resolveStatus({} as Awaited<ReturnType<typeof api.getStatus>>);
    await pending;
  });
  expect(setDevice).toHaveBeenCalledTimes(1);
  expect(setDevice).toHaveBeenCalledWith('replacement');
});

it('hides presets and bypass in release and still requires successful verification', async () => {
  Object.assign(globalThis, { __DEV__: false });
  getStatus.mockRejectedValueOnce(new ApiError(404, 'Not found'));
  await render();
  expect(button('Use test tracker car-001')).toBeUndefined();
  expect(button('Use test tracker KRG0523-59730797')).toBeUndefined();
  expect(button(bypassLabel)).toBeUndefined();
  expect(text()).not.toContain('Development tools');
  await enter('unknown');
  await press('Connect tracker');
  expect(getStatus).toHaveBeenCalledWith('unknown');
  expect(setDevice).not.toHaveBeenCalled();
  expect(button(bypassLabel)).toBeUndefined();
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
});

it('guards development handlers even if retained across a release-mode change', async () => {
  await render();
  await enter('owner-tracker');
  const preset = button('Use test tracker car-001').props.onPress;
  const bypass = button(bypassLabel).props.onPress;
  Object.assign(globalThis, { __DEV__: false });
  await act(async () => {
    preset();
    await bypass();
  });
  expect(input().props.value).toBe('owner-tracker');
  expect(getStatus).not.toHaveBeenCalled();
  expect(setDevice).not.toHaveBeenCalled();
});

it('allows development presets and explicit verification bypass', async () => {
  await render();
  await press('Use test tracker car-001');
  expect(input().props.value).toBe('car-001');
  expect(button('Use test tracker car-001').props.accessibilityState.selected).toBe(true);
  await press(bypassLabel);
  expect(getStatus).not.toHaveBeenCalled();
  expect(setDevice).toHaveBeenCalledWith('car-001');
});

it('resets the input and error on reopening and selected tracker changes', async () => {
  useTrackingStore.setState({ deviceId: 'current', deviceModalVisible: true });
  getStatus.mockRejectedValueOnce(new ApiError(404, 'Not found'));
  await render();
  await enter('unknown');
  await press('Switch tracker');
  expect(text()).toContain('We couldn’t find that tracker.');
  await act(async () => {
    useTrackingStore.getState().setDeviceModalVisible(false);
  });
  await act(async () => {
    useTrackingStore.getState().setDeviceModalVisible(true);
  });
  expect(input().props.value).toBe('current');
  expect(text()).not.toContain('We couldn’t find that tracker.');
  await enter('draft');
  await act(async () => useTrackingStore.getState().setDeviceId('new-current'));
  expect(input().props.value).toBe('new-current');
});
