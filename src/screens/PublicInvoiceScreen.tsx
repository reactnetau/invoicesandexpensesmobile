import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../types/amplify-schema';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { colors, fontSize, spacing, radius, shadow, statusBadgeStyle } from '../theme';
import { formatCurrency, formatDate } from '../utils/currency';
import { Ionicons } from '@expo/vector-icons';

// Use API key auth for unauthenticated access
const client = generateClient<Schema>({ authMode: 'apiKey' });

type Props = StackScreenProps<RootStackParamList, 'PublicInvoice'>;

export function PublicInvoiceScreen({ route }: Props) {
  const publicId = route.params?.publicId;
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!publicId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    client.queries
      .getPublicInvoice({ publicId })
      .then((r) => {
        if (r.data?.found) {
          setInvoice(r.data);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [publicId]);

  if (loading) return <LoadingSpinner fullScreen message="Loading invoice…" />;

  if (notFound || !invoice || !publicId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFoundContainer}>
          <Ionicons name="document-outline" size={48} color={colors.textMuted} />
          <Text style={styles.notFoundTitle}>Invoice not found</Text>
          <Text style={styles.notFoundSubtitle}>
            This invoice link may have expired, been removed, or is no longer public.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const badge = statusBadgeStyle(invoice.status);
  const reference = `INV-${publicId.slice(0, 8).toUpperCase()}`;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header band */}
        <View style={styles.headerBand}>
          <Ionicons name="receipt" size={28} color={colors.primary} />
          <Text style={styles.headerTitle}>Invoice</Text>
          {invoice.businessName && (
            <Text style={styles.businessName}>{invoice.businessName}</Text>
          )}
        </View>

        {/* Amount hero */}
        <View style={styles.hero}>
          <Text style={styles.amountLabel}>Amount due</Text>
          <Text style={styles.amount}>{formatCurrency(invoice.amount, 'AUD')}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>
              {invoice.status === 'paid' ? 'Paid' : 'Unpaid'}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.card}>
          {[
            { label: 'Client', value: invoice.clientName },
            { label: 'Client email', value: invoice.clientEmail ?? 'No email on file' },
            { label: 'Due date', value: formatDate(invoice.dueDate) },
            { label: 'Status', value: invoice.status === 'paid' ? 'Paid' : 'Unpaid' },
            { label: 'Reference', value: reference },
          ].map((row) => (
            <View key={row.label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Payment details */}
        <View style={[styles.card, styles.paymentCard]}>
          <Text style={styles.paymentTitle}>Payment Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reference</Text>
            <Text style={styles.detailValue}>{reference}</Text>
          </View>
          {invoice.payid && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>PayID</Text>
              <Text style={styles.detailValue}>{invoice.payid}</Text>
            </View>
          )}
        </View>

        <Text style={styles.footer}>
          Powered by Invoices &amp; Expenses
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing['2xl'] },
  headerBand: {
    backgroundColor: colors.primaryLight,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text },
  businessName: { fontSize: fontSize.base, color: colors.textSecondary },
  hero: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
  amountLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 4 },
  amount: { fontSize: 40, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1 },
  badgeText: { fontSize: fontSize.sm, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, marginHorizontal: spacing.md,
    marginBottom: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow.sm,
  },
  paymentCard: { backgroundColor: colors.primaryLight, borderColor: colors.border },
  paymentTitle: { fontSize: fontSize.base, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  detailLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500', flex: 1 },
  detailValue: { fontSize: fontSize.sm, color: colors.text, flex: 2, textAlign: 'right' },
  footer: { textAlign: 'center', fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.lg },
  notFoundContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  notFoundTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  notFoundSubtitle: { fontSize: fontSize.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
