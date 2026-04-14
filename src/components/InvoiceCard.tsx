import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Invoice } from '../types';
import { colors, fontSize, spacing, radius, shadow, statusBadgeStyle } from '../theme';
import { formatCurrency, formatDate } from '../utils/currency';

interface Props {
  invoice: Invoice;
  currencyCode?: string;
  onPress?: () => void;
  onMarkPaid?: () => void;
  onDelete?: () => void;
}

export function InvoiceCard({ invoice, currencyCode = 'USD', onPress, onMarkPaid, onDelete }: Props) {
  const badge = statusBadgeStyle(invoice.status);
  const isPaid = invoice.status === 'paid';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.clientName} numberOfLines={1}>{invoice.clientName}</Text>
          <Text style={styles.date}>Due {formatDate(invoice.dueDate)}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.amount}>{formatCurrency(invoice.amount, currencyCode)}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>
              {invoice.status === 'paid' ? 'Paid' : 'Unpaid'}
            </Text>
          </View>
        </View>
      </View>

      {invoice.clientEmail && (
        <Text style={styles.email} numberOfLines={1}>{invoice.clientEmail}</Text>
      )}

      {(onMarkPaid || onDelete) && (
        <View style={styles.actions}>
          {onMarkPaid && !isPaid && (
            <TouchableOpacity style={styles.actionBtn} onPress={onMarkPaid}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.success }]}>Mark paid</Text>
            </TouchableOpacity>
          )}
          {onMarkPaid && isPaid && (
            <TouchableOpacity style={styles.actionBtn} onPress={onMarkPaid}>
              <Ionicons name="ellipse-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>Mark unpaid</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  headerLeft: { flex: 1, marginRight: spacing.sm },
  headerRight: { alignItems: 'flex-end' },
  clientName: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  date: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  amount: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  email: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
});
