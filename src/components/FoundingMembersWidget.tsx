import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../types/amplify-schema';
import { colors, fontSize, radius, shadow, spacing } from '../theme';

const publicClient = generateClient<Schema>({ authMode: 'apiKey' });

type FoundingStatus = {
  claimed: number;
  limit: number;
  available: number;
};

export function FoundingMembersWidget() {
  const [foundingStatus, setFoundingStatus] = useState<FoundingStatus | null>({
    claimed: 0,
    limit: 50,
    available: 50,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadFoundingStatus() {
      try {
        const result = await publicClient.queries.getFoundingMemberStatus();
        const data = result.data;
        if (
          !cancelled &&
          data &&
          typeof data.claimed === 'number' &&
          typeof data.limit === 'number' &&
          typeof data.available === 'number'
        ) {
          setFoundingStatus(
            data.claimed < data.limit
              ? {
                  claimed: data.claimed,
                  limit: data.limit,
                  available: data.available,
                }
              : null
          );
        }
      } catch {
        if (!cancelled) {
          setFoundingStatus({
            claimed: 0,
            limit: 50,
            available: 50,
          });
        }
      }
    }

    void loadFoundingStatus();
    return () => { cancelled = true; };
  }, []);

  if (!foundingStatus) return null;

  return (
    <View style={styles.widget}>
      <View style={styles.icon}>
        <Ionicons name="star-outline" size={18} color={colors.warning} />
      </View>
      <View style={styles.copy}>
        <View style={styles.header}>
          <Text style={styles.title}>Founding memberships</Text>
          <Text style={styles.left}>{foundingStatus.available} left</Text>
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.progress,
              { width: `${Math.min((foundingStatus.claimed / foundingStatus.limit) * 100, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.note}>
          {foundingStatus.claimed}/{foundingStatus.limit} claimed. Founding members get permanent Pro free.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  widget: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.sm,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: { color: colors.text, fontSize: fontSize.sm, fontWeight: '800' },
  left: { color: colors.warning, fontSize: fontSize.xs, fontWeight: '800' },
  track: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: '#FEF3C7',
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progress: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.warning,
  },
  note: { color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 18 },
});
