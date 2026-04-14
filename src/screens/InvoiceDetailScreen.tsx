import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { AppScreenProps } from '../navigation/types';
import { useProfile } from '../hooks/useProfile';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { colors, fontSize, spacing, radius, globalStyles, statusBadgeStyle } from '../theme';
import { formatCurrency, formatDate } from '../utils/currency';
import { type Invoice } from '../types';
import * as WebBrowser from 'expo-web-browser';

const client = generateClient<Schema>();
type Props = AppScreenProps<'InvoiceDetail'>;

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://invoicesandexpenses.com';

export function InvoiceDetailScreen({ route, navigation }: Props) {
  const { invoiceId } = route.params;
  const { profile } = useProfile();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [includes, setIncludes] = useState({
    businessName: true, fullName: false, phone: false,
    address: false, abn: false, payid: false,
  });

  useEffect(() => {
    client.models.Invoice.get({ id: invoiceId }).then((r) => {
      if (r.data) setInvoice(r.data as unknown as Invoice);
    }).finally(() => setLoading(false));
  }, [invoiceId]);

  const handleTogglePaid = async () => {
    if (!invoice) return;
    const newStatus = invoice.status === 'paid' ? 'unpaid' : 'paid';
    const paidAt = newStatus === 'paid' ? new Date().toISOString() : null;
    await client.models.Invoice.update({ id: invoice.id, status: newStatus, paidAt } as any);
    setInvoice((prev) => prev ? { ...prev, status: newStatus as any, paidAt } : prev);
  };

  const handleDelete = async () => {
    if (!invoice) return;
    setDeleteLoading(true);
    try {
      await client.models.Invoice.delete({ id: invoice.id });
      navigation.goBack();
    } finally {
      setDeleteLoading(false);
      setDeleteModal(false);
    }
  };

  const handleSendEmail = async () => {
    if (!invoice) return;
    if (!invoice.clientEmail) {
      Alert.alert('No email', 'This invoice has no client email address.');
      return;
    }
    setEmailLoading(true);
    try {
      const result = await client.mutations.sendInvoiceEmail({
        invoiceId: invoice.id,
        includeBusinessName: includes.businessName,
        includeFullName: includes.fullName,
        includePhone: includes.phone,
        includeAddress: includes.address,
        includeAbn: includes.abn,
        includePayid: includes.payid,
      });
      if (result.data?.ok) {
        Alert.alert('Email sent', `Invoice PDF sent to ${invoice.clientEmail}`);
      } else {
        Alert.alert('Email failed', result.data?.error ?? 'Unknown error');
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setEmailLoading(false);
    }
  };

  const publicUrl = invoice ? `${APP_URL}/invoice/${invoice.publicId}` : '';

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    // expo-clipboard may not be installed — use Alert as fallback
    try {
      const Clipboard = require('expo-clipboard');
      await Clipboard.setStringAsync(publicUrl);
      Alert.alert('Copied', 'Public invoice link copied to clipboard');
    } catch {
      Alert.alert('Public link', publicUrl);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;
  if (!invoice) {
    return (
      <SafeAreaView style={globalStyles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={globalStyles.secondaryText}>Invoice not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const badge = statusBadgeStyle(invoice.status);
  const currency = profile?.currency ?? 'USD';

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Amount hero */}
        <View style={styles.hero}>
          <Text style={styles.amountLabel}>Amount due</Text>
          <Text style={styles.amount}>{formatCurrency(invoice.amount, currency)}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>
              {invoice.status === 'paid' ? 'Paid' : 'Unpaid'}
            </Text>
          </View>
        </View>

        {/* Details card */}
        <View style={globalStyles.card}>
          {[
            { label: 'Client', value: invoice.clientName },
            { label: 'Email', value: invoice.clientEmail ?? 'No email on file' },
            { label: 'Due date', value: formatDate(invoice.dueDate) },
            { label: 'Reference', value: `INV-${invoice.publicId.slice(0, 8).toUpperCase()}` },
            ...(invoice.paidAt ? [{ label: 'Paid at', value: formatDate(invoice.paidAt) }] : []),
          ].map((row) => (
            <View key={row.label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Public link */}
        <View style={[globalStyles.card, { marginTop: spacing.sm }]}>
          <Text style={styles.sectionTitle}>Public invoice link</Text>
          <Text style={styles.publicUrl} numberOfLines={2}>{publicUrl}</Text>
          <View style={styles.linkActions}>
            <TouchableOpacity style={styles.linkBtn} onPress={handleCopyLink}>
              <Ionicons name="copy-outline" size={16} color={colors.primary} />
              <Text style={styles.linkBtnText}>Copy link</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => WebBrowser.openBrowserAsync(publicUrl)}
            >
              <Ionicons name="open-outline" size={16} color={colors.primary} />
              <Text style={styles.linkBtnText}>Open in browser</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Email section */}
        {invoice.clientEmail && (
          <View style={[globalStyles.card, { marginTop: spacing.sm }]}>
            <Text style={styles.sectionTitle}>Send PDF by email</Text>
            {[
              { key: 'businessName' as const, label: 'Business name', available: !!profile?.businessName },
              { key: 'fullName' as const, label: 'Full name', available: !!profile?.fullName },
              { key: 'phone' as const, label: 'Phone', available: !!profile?.phone },
              { key: 'address' as const, label: 'Address', available: !!profile?.address },
              { key: 'abn' as const, label: 'ABN', available: !!profile?.abn },
              { key: 'payid' as const, label: 'PayID', available: true },
            ]
              .filter((f) => f.available)
              .map((f) => (
                <View key={f.key} style={styles.includeRow}>
                  <Text style={styles.includeLabel}>Include {f.label}</Text>
                  <Switch
                    value={includes[f.key]}
                    onValueChange={() => setIncludes((p) => ({ ...p, [f.key]: !p[f.key] }))}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.white}
                  />
                </View>
              ))}
            <TouchableOpacity
              style={[globalStyles.primaryButton, { marginTop: spacing.sm }, emailLoading && { opacity: 0.6 }]}
              onPress={handleSendEmail}
              disabled={emailLoading}
            >
              {emailLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={globalStyles.primaryButtonText}>Send invoice to {invoice.clientEmail}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={globalStyles.secondaryButton} onPress={handleTogglePaid}>
            <Text style={globalStyles.secondaryButtonText}>
              {invoice.status === 'paid' ? 'Mark as unpaid' : 'Mark as paid'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={globalStyles.dangerButton} onPress={() => setDeleteModal(true)}>
            <Text style={globalStyles.dangerButtonText}>Delete invoice</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={deleteModal}
        title="Delete invoice?"
        message="This will permanently delete the invoice and cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: spacing['2xl'] },
  hero: { alignItems: 'center', paddingVertical: spacing.xl },
  amountLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500', marginBottom: 4 },
  amount: { fontSize: 40, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  badge: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 1,
  },
  badgeText: { fontSize: fontSize.sm, fontWeight: '600' },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  detailLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500', flex: 1 },
  detailValue: { fontSize: fontSize.sm, color: colors.text, flex: 2, textAlign: 'right' },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  publicUrl: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.sm, lineHeight: 18 },
  linkActions: { flexDirection: 'row', gap: spacing.sm },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: spacing.xs },
  linkBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '500' },
  includeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  includeLabel: { fontSize: fontSize.sm, color: colors.text },
  actionsSection: { gap: spacing.sm, marginTop: spacing.md },
});
