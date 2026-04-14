import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AuthScreenProps } from '../navigation/types';
import { useAuth, parseAuthError } from '../hooks/useAuth';
import { colors, fontSize, spacing, radius, globalStyles } from '../theme';

type Props = AuthScreenProps<'ConfirmReset'>;

export function ConfirmResetScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const { confirmForgotPassword } = useAuth();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    if (!code.trim()) return setError('Please enter the verification code.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setError(null);
    setLoading(true);
    try {
      await confirmForgotPassword(email, code.trim(), password);
      navigation.navigate('Login');
    } catch (err) {
      setError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Set new password</Text>
          <Text style={styles.subtitle}>Enter the code sent to {email} and your new password.</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={globalStyles.inputContainer}>
            <Text style={globalStyles.label}>Verification code</Text>
            <TextInput
              style={globalStyles.input}
              value={code}
              onChangeText={setCode}
              placeholder="6-digit code"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              returnKeyType="next"
            />
          </View>

          <View style={globalStyles.inputContainer}>
            <Text style={globalStyles.label}>New password</Text>
            <TextInput
              style={globalStyles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleReset}
            />
          </View>

          <TouchableOpacity
            style={[globalStyles.primaryButton, loading && styles.disabled]}
            onPress={handleReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={globalStyles.primaryButtonText}>Reset password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingTop: spacing.xl },
  title: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.base, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.xl },
  errorBox: {
    backgroundColor: colors.errorLight, borderWidth: 1, borderColor: colors.errorBorder,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  errorText: { fontSize: fontSize.sm, color: colors.error },
  disabled: { opacity: 0.6 },
});
