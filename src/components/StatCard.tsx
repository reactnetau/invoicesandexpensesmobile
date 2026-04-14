import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, radius, shadow } from '../theme';

interface Props {
  label: string;
  value: string;
  subtitle?: string;
  accent?: 'default' | 'success' | 'warning' | 'error';
}

export function StatCard({ label, value, subtitle, accent = 'default' }: Props) {
  const accentColor =
    accent === 'success'
      ? colors.success
      : accent === 'warning'
      ? colors.warning
      : accent === 'error'
      ? colors.error
      : colors.primary;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
    minWidth: 140,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
