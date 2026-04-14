import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AuthScreenProps } from '../navigation/types';
import { useAuth, parseAuthError } from '../hooks/useAuth';
import { CURRENCIES } from '../types';
import { colors, fontSize, spacing, radius, globalStyles } from '../theme';
import { enqueueSnackbar } from '../lib/snackbar';

type Props = AuthScreenProps<'Signup'>;

export function SignupScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('AUD');
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCurrency = CURRENCIES.find((c) => c.code === currency)!;

  const handleSignup = async () => {
    if (!email.trim()) return setError('Email is required.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setError(null);
    setLoading(true);
    try {
      const result = await register(email.trim().toLowerCase(), password, currency);
      if (result.needsConfirmation) {
        enqueueSnackbar('Verification code sent', { variant: 'success', description: 'Check your email to verify your account.' });
        navigation.navigate('ConfirmSignup', { email: email.trim().toLowerCase() });
      }
      // If no confirmation needed, RootNavigator handles the transition
    } catch (err) {
      enqueueSnackbar('Sign up failed', { variant: 'error', description: parseAuthError(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Free to start — no credit card required</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={globalStyles.inputContainer}>
            <Text style={globalStyles.label}>Email</Text>
            <TextInput
              style={globalStyles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={globalStyles.inputContainer}>
            <Text style={globalStyles.label}>Password</Text>
            <TextInput
              style={globalStyles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              returnKeyType="next"
            />
          </View>

          <View style={globalStyles.inputContainer}>
            <Text style={globalStyles.label}>Default currency</Text>
            <TouchableOpacity
              style={[globalStyles.input, styles.currencyPicker]}
              onPress={() => setCurrencyPickerVisible(true)}
            >
              <Text style={styles.currencyText}>{selectedCurrency.label}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[globalStyles.primaryButton, loading && styles.disabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={globalStyles.primaryButtonText}>Create account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Currency picker modal */}
      <Modal
        visible={currencyPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCurrencyPickerVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Select currency</Text>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.currencyOption, item.code === currency && styles.selectedOption]}
                  onPress={() => {
                    setCurrency(item.code);
                    setCurrencyPickerVisible(false);
                  }}
                >
                  <Text style={[styles.currencyOptionText, item.code === currency && styles.selectedOptionText]}>
                    {item.label}
                  </Text>
                  {item.code === currency && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingTop: spacing.xl },
  title: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.base, color: colors.textSecondary, marginBottom: spacing.xl },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: fontSize.sm, color: colors.error },
  currencyPicker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  currencyText: { fontSize: fontSize.base, color: colors.text },
  disabled: { opacity: 0.6 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  loginText: { fontSize: fontSize.sm, color: colors.textSecondary },
  loginLink: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  // Picker modal
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  pickerHandle: {
    width: 40, height: 4, backgroundColor: colors.border,
    borderRadius: radius.full, alignSelf: 'center', marginBottom: spacing.md,
  },
  pickerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  currencyOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  selectedOption: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, borderRadius: radius.md },
  currencyOptionText: { fontSize: fontSize.base, color: colors.text },
  selectedOptionText: { color: colors.primary, fontWeight: '600' },
});
