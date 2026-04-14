import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Expense } from '../types';
import { colors, fontSize, spacing, radius, shadow } from '../theme';
import { formatCurrency, formatDate } from '../utils/currency';

interface Props {
  expense: Expense;
  currencyCode?: string;
  onDelete?: () => void;
}

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Software: 'laptop-outline',
  Hardware: 'hardware-chip-outline',
  Marketing: 'megaphone-outline',
  Travel: 'airplane-outline',
  Office: 'business-outline',
  Contractor: 'person-outline',
  Other: 'ellipsis-horizontal-outline',
};

export function ExpenseCard({ expense, currencyCode = 'USD', onDelete }: Props) {
  const icon = CATEGORY_ICONS[expense.category] ?? 'receipt-outline';

  return (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.category}>{expense.category}</Text>
        <Text style={styles.date}>{formatDate(expense.date)}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{formatCurrency(expense.amount, currencyCode)}</Text>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
    marginBottom: spacing.sm,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  content: { flex: 1 },
  category: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  date: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  right: { alignItems: 'flex-end', gap: 6 },
  amount: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.text,
  },
  deleteBtn: { padding: 2 },
});
