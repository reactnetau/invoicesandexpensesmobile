import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../types/amplify-schema';
import type { AppScreenProps } from '../navigation/types';
import { colors, fontSize, spacing, radius, globalStyles } from '../theme';
import { type Client } from '../types';

const client = generateClient<Schema>();
type Props = AppScreenProps<'AddEditClient'>;

export function AddEditClientScreen({ route, navigation }: Props) {
  const { clientId } = route.params ?? {};
  const isEditing = !!clientId;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit client' : 'Add client' });

    if (isEditing && clientId) {
      client.models.Client.get({ id: clientId }).then((r) => {
        const c = r.data as unknown as Client;
        if (c) {
          setName(c.name);
          setEmail(c.email ?? '');
          setPhone(c.phone ?? '');
          setCompany(c.company ?? '');
          setAddress(c.address ?? '');
        }
      }).finally(() => setInitialLoading(false));
    }
  }, [clientId, isEditing, navigation]);

  const handleSave = async () => {
    if (!name.trim()) return setError('Client name is required.');
    setError(null);
    setLoading(true);
    try {
      if (isEditing && clientId) {
        await client.models.Client.update({
          id: clientId,
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          company: company.trim() || undefined,
          address: address.trim() || undefined,
        } as any);
      } else {
        await client.models.Client.create({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          company: company.trim() || undefined,
          address: address.trim() || undefined,
        } as any);
      }
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={globalStyles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {[
            { label: 'Name *', value: name, setter: setName, placeholder: 'Jane Smith', autoCapitalize: 'words' as const },
            { label: 'Email', value: email, setter: setEmail, placeholder: 'jane@example.com', keyboardType: 'email-address' as const, autoCapitalize: 'none' as const },
            { label: 'Phone', value: phone, setter: setPhone, placeholder: '+61 400 000 000', keyboardType: 'phone-pad' as const },
            { label: 'Company', value: company, setter: setCompany, placeholder: 'Acme Pty Ltd', autoCapitalize: 'words' as const },
            { label: 'Address', value: address, setter: setAddress, placeholder: '123 Main St, Sydney NSW 2000' },
          ].map((field) => (
            <View key={field.label} style={globalStyles.inputContainer}>
              <Text style={globalStyles.label}>{field.label}</Text>
              <TextInput
                style={globalStyles.input}
                value={field.value}
                onChangeText={field.setter}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textMuted}
                keyboardType={field.keyboardType ?? 'default'}
                autoCapitalize={field.autoCapitalize ?? 'sentences'}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[globalStyles.primaryButton, loading && styles.disabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={globalStyles.primaryButtonText}>
                {isEditing ? 'Save changes' : 'Add client'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: spacing['2xl'] },
  errorBox: {
    backgroundColor: colors.errorLight, borderWidth: 1, borderColor: colors.errorBorder,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  errorText: { fontSize: fontSize.sm, color: colors.error },
  disabled: { opacity: 0.6 },
});
