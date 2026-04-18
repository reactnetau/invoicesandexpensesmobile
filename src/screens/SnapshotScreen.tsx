import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { generateClient } from 'aws-amplify/data';
import { useFocusEffect } from '@react-navigation/native';
import type { Schema } from '../types/amplify-schema';
import type { TabScreenProps } from '../navigation/types';
import { colors, fontSize, spacing, radius, globalStyles } from '../theme';

const client = generateClient<Schema>();
type Props = TabScreenProps<'Snapshot'>;

interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdAt?: string | null;
}

type Range = '1m' | '3m' | '6m' | '1y';

const RANGES: { value: Range; label: string; months: number }[] = [
  { value: '1m', label: '1 month',  months: 1  },
  { value: '3m', label: '3 months', months: 3  },
  { value: '6m', label: '6 months', months: 6  },
  { value: '1y', label: '1 year',   months: 12 },
];

const EVENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  invoice_created: 'document-text-outline',
  expense_created: 'receipt-outline',
  client_created:  'person-add-outline',
};

const EVENT_BG: Record<string, string> = {
  invoice_created: '#EFF6FF',
  expense_created: '#FFF7ED',
  client_created:  '#F0FDF4',
};

const EVENT_COLOR: Record<string, string> = {
  invoice_created: '#2563EB',
  expense_created: '#EA580C',
  client_created:  '#16A34A',
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function SnapshotScreen({ }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<Range>('3m');
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      const result = await (client as any).models.ActivityEvent.list({ limit: 1000 });
      const sorted: ActivityEvent[] = [...((result.data as ActivityEvent[]) ?? [])].sort(
        (a, b) => (b.createdAt ?? '') > (a.createdAt ?? '') ? 1 : -1
      );
      setEvents(sorted);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const cutoff = (() => {
    const d = new Date();
    const months = RANGES.find((r) => r.value === range)?.months ?? 3;
    d.setMonth(d.getMonth() - months);
    return d;
  })();

  const visible = events.filter((e) => new Date(e.createdAt ?? '') >= cutoff);
  const selectedRangeLabel = RANGES.find((r) => r.value === range)?.label ?? '3 months';

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Snapshot</Text>
        <TouchableOpacity style={styles.rangeBtn} onPress={() => setPickerOpen(true)}>
          <Text style={styles.rangeBtnText}>{selectedRangeLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {loading ? null : visible.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pulse-outline" size={40} color={colors.border} />
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptyText}>
              Events will appear here as you create invoices, expenses, and clients.
            </Text>
          </View>
        ) : (
          visible.map((event) => {
            const iconName = EVENT_ICONS[event.type] ?? 'ellipse-outline';
            const iconBg = EVENT_BG[event.type] ?? colors.surfaceSecondary;
            const iconColor = EVENT_COLOR[event.type] ?? colors.textSecondary;
            return (
              <View key={event.id} style={styles.eventCard}>
                <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
                  <Ionicons name={iconName} size={18} color={iconColor} />
                </View>
                <View style={styles.eventBody}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  {event.description ? (
                    <Text style={styles.eventDesc} numberOfLines={1}>{event.description}</Text>
                  ) : null}
                  <Text style={styles.eventTime}>{formatDateTime(event.createdAt)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Range picker modal */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Time range</Text>
            <FlatList
              data={RANGES}
              keyExtractor={(r) => r.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, item.value === range && styles.pickerItemActive]}
                  onPress={() => { setRange(item.value); setPickerOpen(false); }}
                >
                  <Text style={[styles.pickerItemText, item.value === range && styles.pickerItemTextActive]}>
                    {item.label}
                  </Text>
                  {item.value === range && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text },
  rangeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rangeBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  scroll: { padding: spacing.md, paddingBottom: spacing['2xl'] },
  emptyState: { alignItems: 'center', paddingVertical: spacing['2xl'] * 2 },
  emptyTitle: { fontSize: fontSize.base, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.md },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, maxWidth: 260 },
  eventCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  eventBody: { flex: 1 },
  eventTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  eventDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  eventTime: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.md, paddingBottom: spacing['2xl'],
  },
  pickerTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.sm,
    borderRadius: radius.md, marginBottom: 2,
  },
  pickerItemActive: { backgroundColor: colors.primaryLight },
  pickerItemText: { fontSize: fontSize.base, color: colors.text },
  pickerItemTextActive: { color: colors.primary, fontWeight: '600' },
});
