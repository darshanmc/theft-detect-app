import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, ApiError } from '../api/client';
import { trackingService } from '../services/trackingService';
import { useTrackingStore } from '../state/trackingStore';

const PRESET_DEVICES = ['KRG0523-59730797', 'car-001'];

export function DeviceSelectionModal() {
  const deviceId = useTrackingStore((s) => s.deviceId);
  const hydrated = useTrackingStore((s) => s.hydrated);
  const modalVisible = useTrackingStore((s) => s.deviceModalVisible);
  const setDeviceModalVisible = useTrackingStore((s) => s.setDeviceModalVisible);

  const [inputVal, setInputVal] = useState(deviceId || '');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If store is hydrated and no device is set, always show modal
  const isVisible = hydrated && (!deviceId || modalVisible);
  const isCancellable = Boolean(deviceId);

  const handleConnect = async (force: boolean = false) => {
    const trimmed = inputVal.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a valid device ID');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (!force) {
        // Validate device exists in DynamoDB
        await api.getStatus(trimmed);
      }
      await trackingService.setDevice(trimmed);
      setDeviceModalVisible(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setErrorMessage(`Device "${trimmed}" not found in DynamoDB.`);
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : 'Could not reach server to verify device.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: string) => {
    setInputVal(preset);
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (isCancellable) {
      setErrorMessage(null);
      setDeviceModalVisible(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Vehicle Tracker Setup</Text>
          <Text style={styles.subtitle}>
            Enter the device ID attached to your vehicle to start tracking.
          </Text>

          <TextInput
            style={styles.input}
            value={inputVal}
            onChangeText={(text) => {
              setInputVal(text);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="e.g. KRG0523-59730797 or car-001"
            placeholderTextColor="#90a4ae"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <View style={styles.presetsContainer}>
            <Text style={styles.presetsLabel}>Quick select:</Text>
            <View style={styles.presetButtons}>
              {PRESET_DEVICES.map((preset) => (
                <Pressable
                  key={preset}
                  style={[
                    styles.presetBadge,
                    inputVal === preset && styles.presetBadgeActive,
                  ]}
                  onPress={() => handleSelectPreset(preset)}
                >
                  <Text
                    style={[
                      styles.presetText,
                      inputVal === preset && styles.presetTextActive,
                    ]}
                  >
                    {preset}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Pressable
                style={styles.forceButton}
                onPress={() => handleConnect(true)}
              >
                <Text style={styles.forceButtonText}>
                  Connect anyway (skip verification)
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.actions}>
            {isCancellable && (
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            )}
            <Pressable
              style={[
                styles.button,
                styles.submitButton,
                !inputVal.trim() && styles.buttonDisabled,
              ]}
              onPress={() => handleConnect(false)}
              disabled={loading || !inputVal.trim()}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {deviceId ? 'Switch Device' : 'Connect Device'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#263238',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#546e7a',
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#cfd8dc',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#263238',
    backgroundColor: '#f8fafc',
    marginBottom: 14,
  },
  presetsContainer: {
    marginBottom: 16,
  },
  presetsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909c',
    marginBottom: 8,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetBadge: {
    backgroundColor: '#eceff1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#cfd8dc',
  },
  presetBadgeActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  presetText: {
    fontSize: 12,
    color: '#455a64',
    fontWeight: '500',
  },
  presetTextActive: {
    color: '#0284c7',
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    fontSize: 13,
    color: '#c62828',
    marginBottom: 8,
  },
  forceButton: {
    paddingVertical: 4,
  },
  forceButtonText: {
    fontSize: 12,
    color: '#b71c1c',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#eceff1',
  },
  cancelButtonText: {
    color: '#455a64',
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#0284c7',
    flex: 1,
  },
  buttonDisabled: {
    backgroundColor: '#b0bec5',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
