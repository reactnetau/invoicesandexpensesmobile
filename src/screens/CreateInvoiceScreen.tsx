import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Switch, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../types/amplify-schema';
import type { AppScreenProps } from '../navigation/types';
import { useProfile } from '../hooks/useProfile';
import { ClientCard } from '../components/ClientCard';
import { colors, fontSize, spacing, radius, globalStyles } from '../theme';
import { type Client } from '../types';

const client = generateClient<Schema>();
type Props = AppScreenProps<'CreateInvoice'>;

interface IncludeFields {
  businessName: boolean;
  fullName: boolean;
  phone: boolean;
  address: boolean;
  abn: boolean;
  payid: boolean;
}

export function CreateInvoiceScreen({ navigation }: Props) {
  const { profile } = useProfile();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [sendEmail, setSendEmail] = useState(false);
  const [includes, setIncludes] = useState<IncludeFields>({
    businessName: true,
    fullName: false,
    phone: false,
    address: false,
    abn: false,
    payid: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    const result = await client.models.Client.list();
    const sorted = [...(result.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    setClients(sorted as unknown as Client[]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [loadClients])
  );

  const selectClient = (c: Client) => {
    setSelectedClient(c);
    setClientName(c.name);
    setClientEmail(c.email ?? '');
    setClientPickerOpen(false);
  };

  const clearClient = () => {
    setSelectedClient(null);
    setClientName('');
    setClientEmail('');
  };

  const toggleInclude = (key: keyof IncludeFields) => {
    setIncludes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCreate = async () => {
    if (!clientName.trim()) return setError('Client name is required.');
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return setError('Enter a valid amount.');
    if (!dueDate) return setError('Due date is required.');
    if (sendEmail && !clientEmail.trim()) return setError('Client email is required to send invoice.');

    setError(null);
    setLoading(true);

    try {
      const result = await client.mutations.issueInvoice({
        clientId: selectedClient?.id,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim() || undefined,
        amount: parsedAmount,
        dueDate: new Date(dueDate).toISOString(),
        sendEmail,
        includeBusinessName: includes.businessName,
        includeFullName: includes.fullName,
        includePhone: includes.phone,
        includeAddress: includes.address,
        includeAbn: includes.abn,
        includePayid: includes.payid,
      });

      const data = result.data;
      if (data?.errorCode === 'limit_reached') {
        Alert.alert('Invoice limit reached', data.error ?? 'Upgrade to Pro for unlimited invoices.');
        return;
      }
      if (data?.error) {
        setError(data.error);
        return;
      }

      if (data?.emailSent === false && data?.emailError) {
        Alert.alert(
          'Invoice created',
          `Invoice was created but the email could not be sent: ${data.emailError}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const hasProfile = !!(profile?.businessName || profile?.fullName);

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Client selector */}
          <View style={globalStyles.inputContainer}>
            <Text style={globalStyles.label}>Client</Text>
            {selectedClient ? (
              <View style={styles.selectedClientRow}>
                <ClientCard client={selectedClient} selected />
                <TouchableOpacity onPress={clearClient} style={styles.clearClientBtn}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[globalStyles.input, styles.clientPickerBtn]}
                onPress={() => setClientPickerOpen(!clientPickerOpen)}
              >
                <Text style={{ color: colors.textMuted }}>Select a saved client (optional)</Text>
                <Ionicons name={clientPickerOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            {clientPickerOpen && !selectedClient && (
              <View style={styles.clientDropdown}>
                {clients.length === 0 ? (
                  <View style={styles.noClientsBox}>
                    <Text style={styles.noClientsText}>No clients yet.</Text>
                    <TouchableOpacity
                      style={styles.addClientButton}
                      onPress={() => navigation.navigate('AddEditClient', {})}
                    >
                      <Ionicons name="person-add-outline" size={16} color={colors.primary} />
                      <Text style={styles.addClientButtonText}>Add a client</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  clients.map((c) => (
                    <ClientCard key={c.id} client={c} onPress={() => selectClient(c)} />
                  ))
                )}
              </View>
            )}
          </View>

          <View style={globalStyles.inputContainer}>
            <Text style={globalStyles.label}>Client name *</Text>
            <TextInput
              style={globalStyles.input}
              value={clientName}
              onChangeText={setClientName}
              placeholder="Jane Smith"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={globalStyles.inputContainer}>
            <Text style={globalStyles.label}>Client email</Text>
            <TextInput
              style={globalStyles.input}
              value={clientEmail}
              onChangeText={setClientEmail}
              placeholder="jane@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={globalStyles.inputContainer}>
            <Text style={globalStyles.label}>Amount ({profile?.currency ?? 'USD'}) *</Text>
            <TextInput
              style={globalStyles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="500.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={globalStyles.inputContainer}>
            <Text style={globalStyles.label}>Due date *</Text>
            <TextInput
              style={globalStyles.input}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          {/* Email sending toggle */}
          {clientEmail.trim() !== '' && (
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.switchTitle}>Send invoice by email</Text>
                <Text style={styles.switchSubtitle}>
                  A PDF will be attached and sent to {clientEmail}
                </Text>
              </View>
              <Switch
                value={sendEmail}
                onValueChange={setSendEmail}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          )}

          {/* Include fields in PDF */}
          {sendEmail && hasProfile && (
            <View style={styles.includeSection}>
              <Text style={styles.includeSectionTitle}>Include in PDF & email</Text>
              {[
                { key: 'businessName' as const, label: 'Business name', available: !!profile?.businessName },
                { key: 'fullName' as const, label: 'Full name', available: !!profile?.fullName },
                { key: 'phone' as const, label: 'Phone number', available: !!profile?.phone },
                { key: 'address' as const, label: 'Address', available: !!profile?.address },
                { key: 'abn' as const, label: 'ABN', available: !!profile?.abn },
                { key: 'payid' as const, label: 'PayID', available: true },
              ]
                .filter((f) => f.available)
                .map((f) => (
                  <View key={f.key} style={styles.includeRow}>
                    <Text style={styles.includeLabel}>{f.label}</Text>
                    <Switch
                      value={includes[f.key]}
                      onValueChange={() => toggleInclude(f.key)}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.white}
                    />
                  </View>
                ))}
            </View>
          )}

          <TouchableOpacity
            style={[globalStyles.primaryButton, loading && styles.disabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={globalStyles.primaryButtonText}>
                {sendEmail ? 'Create & send invoice' : 'Create invoice'}
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
  clientPickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectedClientRow: { position: 'relative' },
  clearClientBtn: { position: 'absolute', top: spacing.sm, right: spacing.sm, zIndex: 1 },
  clientDropdown: {
    marginTop: spacing.xs, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.sm, maxHeight: 260,
  },
  noClientsBox: { alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  noClientsText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
  addClientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
  },
  addClientButtonText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  switchLabel: { flex: 1, marginRight: spacing.md },
  switchTitle: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  switchSubtitle: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  includeSection: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, gap: spacing.xs,
  },
  includeSectionTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  includeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  includeLabel: { fontSize: fontSize.base, color: colors.text },
  disabled: { opacity: 0.6 },
});
