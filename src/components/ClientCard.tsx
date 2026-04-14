import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Client } from '../types';
import { colors, fontSize, spacing, radius, shadow } from '../theme';

interface Props {
  client: Client;
  onPress?: () => void;
  onDelete?: () => void;
  selected?: boolean;
}

export function ClientCard({ client, onPress, onDelete, selected }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.selectedCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {client.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.name}>{client.name}</Text>
        {client.email && <Text style={styles.email} numberOfLines={1}>{client.email}</Text>}
        {client.company && <Text style={styles.company} numberOfLines={1}>{client.company}</Text>}
      </View>
      {selected && (
        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
      )}
      {onDelete && !selected && (
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
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
  selectedCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
  },
  content: { flex: 1 },
  name: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  email: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  company: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
});
