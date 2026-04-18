import React, { useState, useCallback, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../types/amplify-schema';
import type { AppScreenProps } from '../navigation/types';
import { useProfile } from '../hooks/useProfile';
import { ClientCard } from '../components/ClientCard';
import { ConfirmModal } from '../components/ConfirmModal';
import { DatePickerField } from '../components/DatePickerField';
import {
  IncludeFields, INCLUDE_FIELDS_DEFAULT, getIncludeFieldDefs, IncludeFieldsSection,
} from '../components/IncludeFieldsSection';
import { colors, fontSize, spacing, radius, globalStyles } from '../theme';
import { enqueueSnackbar } from '../lib/snackbar';
import { logActivity } from '../lib/activity';
import { type Client } from '../types';

const client = generateClient<Schema>();
type Props = AppScreenProps<'CreateInvoice'>;

export function CreateInvoiceScreen({ navigation }: Props) {
  const { profile, loading: profileLoading, fetchProfile } = useProfile();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [sendEmail, setSendEmail] = useState(false);
  const [includes, setIncludes] = useState<IncludeFields>(INCLUDE_FIELDS_DEFAULT);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  const loadClients = useCallback(async () => {
    const result = await client.models.Client.list();
    const sorted = [...(result.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    setClients(sorted as unknown as Client[]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setProfileChecked(false);
      fetchProfile().finally(() => setProfileChecked(true));
      loadClients();
    }, [fetchProfile, loadClients])
  );

  useEffect(() => {
    if (profileChecked && !profileLoading && !profile) {
      setProfileModalVisible(true);
    }
  }, [profile, profileChecked, profileLoading]);

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


  const handleCreate = async () => {
    if (!profile) {
      setProfileModalVisible(true);
      return;
    }
    if (!clientName.trim()) return setError('Client name is required.');
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return setError('Enter a valid amount.');
    if (!dueDate) return setError('Due date is required.');
    if (sendEmail && !clientEmail.trim()) return setError('Client email is required to send invoice.');

    setError(null);

    // Build safe includes — ensure a field is never sent as true when the
    // corresponding profile value is missing. PayID is exempt since its
    // availability cannot be checked client-side.
    const safeIncludes: IncludeFields = {
      businessName: includes.businessName && !!profile.businessName,
      fullName:     includes.fullName     && !!profile.fullName,
      phone:        includes.phone        && !!profile.phone,
      address:      includes.address      && !!profile.address,
      abn:          includes.abn          && !!profile.abn,
      payid:        includes.payid,
    };

    // When email sending is on, surface any staleness to the user rather than
    // silently dropping fields they thought they had selected.
    if (sendEmail) {
      const fieldDefs = getIncludeFieldDefs(profile);
      const firstStale = fieldDefs.find(
        (f) => f.key !== 'payid' && includes[f.key] && !f.available
      );
      if (firstStale) {
        setIncludes(safeIncludes);
        // The IncludeFieldsSection modal will re-appear on the next toggle attempt;
        // here we just reset stale state and let the user correct it.
        return;
      }
    }

    setLoading(true);

    try {
      const issueInvoice = () => client.mutations.issueInvoice({
        clientId: selectedClient?.id,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim() || undefined,
        amount: parsedAmount,
        dueDate: dueDate.toISOString(),
        sendEmail,
        includeBusinessName: safeIncludes.businessName,
        includeFullName:     safeIncludes.fullName,
        includePhone:        safeIncludes.phone,
        includeAddress:      safeIncludes.address,
        includeAbn:          safeIncludes.abn,
        includePayid:        safeIncludes.payid,
      });

      const result = await issueInvoice();

      const data = result.data;
      if (data?.errorCode === 'limit_reached') {
        enqueueSnackbar('Invoice limit reached', { variant: 'error', description: data.error ?? 'Upgrade to Pro for unlimited invoices.' });
        return;
      }
      if (data?.error) {
        enqueueSnackbar('Failed to create invoice', { variant: 'error', description: data.error });
        return;
      }

      if (data?.emailSent === false && data?.emailError) {
        enqueueSnackbar('Invoice created', {
          variant: 'info',
          description: `The invoice was created but the email could not be sent: ${data.emailError}`,
          duration: 4500,
        });
        navigation.goBack();
        return;
      }

      logActivity('invoice_created', 'Invoice created', {
        description: `Invoice for ${clientName.trim()} · ${parsedAmount.toFixed(2)}`,
        entityType: 'Invoice',
        entityId: data?.id ?? undefined,
      });
      enqueueSnackbar(sendEmail ? 'Invoice created and emailed' : 'Invoice created', { variant: 'success' });
      navigation.goBack();
    } catch (err) {
      enqueueSnackbar('Failed to create invoice', { variant: 'error', description: err instanceof Error ? err.message : 'Failed to create invoice' });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !loading && !profileLoading;

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

          <DatePickerField
            label="Due date *"
            value={dueDate}
            onChange={setDueDate}
          />

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

          {/* Include fields in PDF — delegates to IncludeFieldsSection which shows
              all fields, guards unavailable ones, and owns the missing-field modal. */}
          {sendEmail && !!profile && (
            <View style={styles.includeSection}>
              <Text style={styles.includeSectionTitle}>Include in PDF & email</Text>
              <IncludeFieldsSection
                profile={profile}
                includes={includes}
                onToggle={(key) => setIncludes((prev) => ({ ...prev, [key]: !prev[key] }))}
                onNavigateToSettings={() => navigation.navigate('Settings')}
              />
            </View>
          )}

          <TouchableOpacity
            style={[globalStyles.primaryButton, !canSubmit && styles.disabled]}
            onPress={handleCreate}
            disabled={!canSubmit}
          >
            {loading || profileLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={globalStyles.primaryButtonText}>
                {sendEmail ? 'Create & send invoice' : 'Create invoice'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={profileModalVisible}
        title="Profile setup required"
        message="You need to fill in your profile before creating an invoice."
        confirmLabel="Open settings"
        cancelLabel="Close"
        onConfirm={() => {
          setProfileModalVisible(false);
          navigation.navigate('Settings');
        }}
        onCancel={() => setProfileModalVisible(false)}
      />

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
  disabled: { opacity: 0.6 },
});
