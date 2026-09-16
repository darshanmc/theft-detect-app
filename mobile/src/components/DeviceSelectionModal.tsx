import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../api/client';
import { trackingService } from '../services/trackingService';
import { useTrackingStore } from '../state/trackingStore';
import { colors, radius, spacing } from '../theme';

const PRESET_DEVICES = ['KRG0523-59730797', 'car-001'];

export function DeviceSelectionModal() {
  const deviceId = useTrackingStore(s => s.deviceId);
  const hydrated = useTrackingStore(s => s.hydrated);
  const modalVisible = useTrackingStore(s => s.deviceModalVisible);
  const setDeviceModalVisible = useTrackingStore(s => s.setDeviceModalVisible);
  const [inputVal, setInputVal] = useState(deviceId || '');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // React state alone cannot block a second action before the next render.
  const connecting = useRef(false);
  const isVisible = hydrated && (!deviceId || modalVisible);
  const isCancellable = Boolean(deviceId);
  const connectLabel = deviceId ? 'Switch tracker' : 'Connect tracker';
  const connectDisabled = loading || !inputVal.trim();

  useEffect(() => {
    setInputVal(deviceId || '');
    setErrorMessage(null);
  }, [isVisible, deviceId]);

  const handleConnect = async (force = false) => {
    if (connecting.current || !isVisible || (force && !__DEV__)) {
      return;
    }
    const trimmed = inputVal.trim();
    if (!trimmed) {
      setErrorMessage('Enter the tracker ID printed on your device.');
      return;
    }

    connecting.current = true;
    setLoading(true);
    setErrorMessage(null);
    try {
      if (!force) {
        await api.getStatus(trimmed);
      }
      await trackingService.setDevice(trimmed);
      setDeviceModalVisible(false);
    } catch (err) {
      console.warn('[DeviceSelectionModal] Tracker connection failed', err);
      setErrorMessage(
        err instanceof ApiError && err.status === 404
          ? 'We couldn’t find that tracker. Check the ID on your device and try again.'
          : 'We couldn’t connect to your tracker. Check your internet connection and try again.',
      );
    } finally {
      connecting.current = false;
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: string) => {
    if (!__DEV__ || connecting.current) {
      return;
    }
    setInputVal(preset);
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (isCancellable && !connecting.current) {
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
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card} accessibilityViewIsModal>
              <Text style={styles.eyebrow}>YOUR VEHICLE · TRACKER SETUP</Text>
              <Text style={styles.title} accessibilityRole="header">
                {deviceId ? 'Switch your tracker' : 'Connect your vehicle'}
              </Text>
              <Text style={styles.subtitle}>
                Enter the ID printed on your vehicle’s tracker. We’ll verify it
                before connecting.
              </Text>
              <Text style={styles.label}>Tracker ID</Text>
              <TextInput
                accessibilityLabel="Tracker ID"
                accessibilityHint="Enter the ID printed on your vehicle’s tracker"
                accessibilityState={{ disabled: loading }}
                style={[styles.input, !!errorMessage && styles.inputError]}
                value={inputVal}
                onChangeText={text => {
                  if (!connecting.current) {
                    setInputVal(text);
                    setErrorMessage(null);
                  }
                }}
                placeholder="Enter tracker ID"
                placeholderTextColor={colors.muted}
                keyboardAppearance="light"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="go"
                onSubmitEditing={() => handleConnect()}
              />
              {errorMessage && (
                <View style={styles.errorBox}>
                  <Text
                    style={styles.errorText}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                  >
                    {errorMessage}
                  </Text>
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={connectLabel}
                accessibilityState={{ disabled: connectDisabled, busy: loading }}
                style={[
                  styles.button,
                  styles.submitButton,
                  connectDisabled && styles.buttonDisabled,
                ]}
                onPress={() => handleConnect()}
                disabled={connectDisabled}
              >
                {loading && <ActivityIndicator color={colors.surface} size="small" />}
                <Text style={styles.submitButtonText}>
                  {loading ? 'Connecting…' : connectLabel}
                </Text>
              </Pressable>
              {isCancellable && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel switching tracker"
                  accessibilityState={{ disabled: loading }}
                  style={[
                    styles.button,
                    styles.cancelButton,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              )}
              {!isCancellable && (
                <Text style={styles.helpText}>
                  Connect a tracker to continue. Need the ID? Check the label on
                  your device or contact your installer.
                </Text>
              )}
              {__DEV__ && (
                <View style={styles.developmentPanel}>
                  <Text style={styles.label}>Development tools</Text>
                  <Text style={styles.helpText}>
                    Test trackers and unverified connections. Development builds
                    only.
                  </Text>
                  <View style={styles.presetButtons}>
                    {PRESET_DEVICES.map(preset => (
                      <Pressable
                        key={preset}
                        accessibilityRole="button"
                        accessibilityLabel={`Use test tracker ${preset}`}
                        accessibilityState={{
                          disabled: loading,
                          selected: inputVal === preset,
                        }}
                        style={[
                          styles.presetBadge,
                          inputVal === preset && styles.presetBadgeActive,
                          loading && styles.buttonDisabled,
                        ]}
                        onPress={() => handleSelectPreset(preset)}
                        disabled={loading}
                      >
                        <Text style={styles.presetText}>{preset}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Connect without verification (development only)"
                    accessibilityState={{ disabled: connectDisabled }}
                    style={[
                      styles.button,
                      styles.cancelButton,
                      connectDisabled && styles.buttonDisabled,
                    ]}
                    onPress={() => handleConnect(true)}
                    disabled={connectDisabled}
                  >
                    <Text style={styles.cancelButtonText}>
                      Skip verification (development only)
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.lg,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.canvas,
    marginBottom: spacing.md,
  },
  inputError: { borderColor: colors.alert },
  errorBox: {
    backgroundColor: colors.alertSoft,
    borderRadius: radius.sm,
    padding: 14,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.alert,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  submitButton: { backgroundColor: colors.primary },
  submitButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 12,
  },
  cancelButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  buttonDisabled: { opacity: 0.55 },
  helpText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  developmentPanel: {
    marginTop: spacing.lg,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 12,
  },
  presetBadge: {
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: colors.canvas,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetBadgeActive: { borderColor: colors.primary },
  presetText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
});
