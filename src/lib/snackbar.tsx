import React from 'react';
import { StyleSheet } from 'react-native';
import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { colors, fontSize, radius } from '../theme';

export type SnackbarVariant = 'success' | 'error' | 'info';

interface SnackbarOptions {
  variant?: SnackbarVariant;
  description?: string;
  duration?: number;
}

const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={[styles.toast, styles.successToast]}
      contentContainerStyle={styles.content}
      text1Style={styles.title}
      text2Style={styles.description}
      text2NumberOfLines={3}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={[styles.toast, styles.errorToast]}
      contentContainerStyle={styles.content}
      text1Style={styles.title}
      text2Style={styles.description}
      text2NumberOfLines={3}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={[styles.toast, styles.infoToast]}
      contentContainerStyle={styles.content}
      text1Style={styles.title}
      text2Style={styles.description}
      text2NumberOfLines={3}
    />
  ),
};

export function enqueueSnackbar(message: string, options: SnackbarOptions = {}) {
  const { variant = 'info', description, duration = 3200 } = options;

  Toast.show({
    type: variant,
    text1: message,
    text2: description,
    position: 'top',
    visibilityTime: duration,
    autoHide: true,
    topOffset: 56,
  });
}

export function MobileSnackbarHost() {
  return <Toast config={toastConfig} topOffset={56} />;
}

const styles = StyleSheet.create({
  toast: {
    borderLeftWidth: 0,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    minHeight: 60,
    paddingRight: 8,
  },
  successToast: {
    borderTopWidth: 3,
    borderTopColor: colors.success,
  },
  errorToast: {
    borderTopWidth: 3,
    borderTopColor: colors.error,
  },
  infoToast: {
    borderTopWidth: 3,
    borderTopColor: colors.primary,
  },
  content: {
    paddingHorizontal: 12,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});