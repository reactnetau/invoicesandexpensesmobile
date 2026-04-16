import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AuthScreenProps } from '../navigation/types';
import { useAuth } from '../hooks/useAuth';
import { enqueueSnackbar } from '../lib/snackbar';
import { colors, fontSize, spacing, globalStyles } from '../theme';

type Props = AuthScreenProps<'ConfirmSignup'>;

export function ConfirmSignupScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const { confirmEmail } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!code.trim()) {
      enqueueSnackbar('Code required', { variant: 'error', description: 'Please enter the verification code.' });
      return;
    }
    setLoading(true);
    try {
      await confirmEmail(email, code.trim());
      navigation.navigate('Login');
    } catch {
      // error already shown by useAuth
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.emoji}>📧</Text>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            We sent a verification code to {email}. Enter it below to activate your account.
          </Text>

          <View style={globalStyles.inputContainer}>
            <Text style={globalStyles.label}>Verification code</Text>
            <TextInput
              style={[globalStyles.input, styles.codeInput]}
              value={code}
              onChangeText={setCode}
              placeholder="6-digit code"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
            />
          </View>

          <TouchableOpacity
            style={[globalStyles.primaryButton, loading && styles.disabled]}
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={globalStyles.primaryButtonText}>Verify email</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.backText}>Back to sign in</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingTop: spacing.xl },
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: spacing.md },
  title: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text, marginBottom: spacing.xs, textAlign: 'center' },
  subtitle: { fontSize: fontSize.base, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.xl, textAlign: 'center' },
  codeInput: { textAlign: 'center', fontSize: fontSize.xl, letterSpacing: 8 },
  disabled: { opacity: 0.6 },
  backLink: { padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  backText: { fontSize: fontSize.sm, color: colors.textSecondary },
});
