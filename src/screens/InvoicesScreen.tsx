import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { TabScreenProps } from '../navigation/types';
import { useProfile } from '../hooks/useProfile';
import { InvoiceCard } from '../components/InvoiceCard';
import { EmptyState } from '../components/EmptyState';
import { ConfirmModal } from '../components/ConfirmModal';
import { ProModal } from '../components/ProModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { colors, fontSize, spacing, globalStyles } from '../theme';
import { type Invoice, isPro, FREE_INVOICE_LIMIT } from '../types';
import * as WebBrowser from 'expo-web-browser';

const client = generateClient<Schema>();
type Props = TabScreenProps<'Invoices'>;

export function InvoicesScreen({ navigation }: Props) {
  const { profile } = useProfile();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [proModalVisible, setProModalVisible] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const loadInvoices = useCallback(async () => {
    const result = await client.models.Invoice.list();
    const sorted = [...(result.data ?? [])].sort(
      (a, b) => ((b as any).createdAt ?? '') > ((a as any).createdAt ?? '') ? 1 : -1
    );
    setInvoices(sorted as unknown as Invoice[]);
  }, []);

  useEffect(() => {
    loadInvoices().finally(() => setLoading(false));
  }, [loadInvoices]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  const handleTogglePaid = async (invoice: Invoice) => {
    const newStatus = invoice.status === 'paid' ? 'unpaid' : 'paid';
    const paidAt = newStatus === 'paid' ? new Date().toISOString() : null;
    await client.models.Invoice.update({ id: invoice.id, status: newStatus, paidAt } as any);
    setInvoices((prev) =>
      prev.map((i) => i.id === invoice.id ? { ...i, status: newStatus as any, paidAt } : i)
    );
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await client.models.Invoice.delete({ id: deleteTarget });
      setInvoices((prev) => prev.filter((i) => i.id !== deleteTarget));
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const handleCreateInvoice = () => {
    const userIsPro = profile ? isPro(profile) : false;
    if (!userIsPro) {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      const monthCount = invoices.filter((i) => new Date(i.createdAt ?? '') >= thisMonth).length;
      if (monthCount >= FREE_INVOICE_LIMIT) {
        setProModalVisible(true);
        return;
      }
    }
    (navigation as any).navigate('CreateInvoice');
  };

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const result = await client.queries.stripeCreateCheckout();
      const url = result.data?.url;
      if (url) {
        await WebBrowser.openBrowserAsync(url);
        setProModalVisible(false);
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Upgrade failed');
    } finally {
      setUpgradeLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreateInvoice}>
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Invoice count for free users */}
      {profile && !isPro(profile) && (
        <View style={styles.limitBanner}>
          <Text style={styles.limitText}>
            {invoices.filter((i) => {
              const d = new Date(i.createdAt ?? '');
              const m = new Date(); m.setDate(1); m.setHours(0,0,0,0);
              return d >= m;
            }).length} / {FREE_INVOICE_LIMIT} invoices this month (free plan)
          </Text>
        </View>
      )}

      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No invoices yet"
            subtitle="Create your first invoice and send it to a client."
            actionLabel="Create invoice"
            onAction={handleCreateInvoice}
          />
        }
        renderItem={({ item }) => (
          <InvoiceCard
            invoice={item}
            currencyCode={profile?.currency ?? 'USD'}
            onPress={() => (navigation as any).navigate('InvoiceDetail', { invoiceId: item.id })}
            onMarkPaid={() => handleTogglePaid(item)}
            onDelete={() => setDeleteTarget(item.id)}
          />
        )}
      />

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete invoice?"
        message="This will permanently delete the invoice. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ProModal
        visible={proModalVisible}
        reason={`You've reached the free plan limit of ${FREE_INVOICE_LIMIT} invoices this month.`}
        loading={upgradeLoading}
        onUpgrade={handleUpgrade}
        onClose={() => setProModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, paddingBottom: spacing.sm,
  },
  title: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text },
  createBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  limitBanner: {
    marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.sm,
    backgroundColor: colors.warningLight, borderRadius: 8, borderWidth: 1, borderColor: colors.warningBorder,
  },
  limitText: { fontSize: fontSize.xs, color: colors.warning, textAlign: 'center', fontWeight: '500' },
  list: { padding: spacing.md, paddingTop: 0, paddingBottom: spacing['2xl'] },
});
