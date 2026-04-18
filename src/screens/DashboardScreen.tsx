import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../types/amplify-schema';
import { useFocusEffect } from '@react-navigation/native';
import type { TabScreenProps } from '../navigation/types';
import { useProfile } from '../hooks/useProfile';
import { useSubscription } from '../providers/SubscriptionProvider';
import { StatCard } from '../components/StatCard';
import { InvoiceCard } from '../components/InvoiceCard';
import { ExpenseCard } from '../components/ExpenseCard';
import { AskAiModal } from '../components/AskAiModal';
import { ProModal } from '../components/ProModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { colors, fontSize, spacing, radius, globalStyles } from '../theme';
import { formatCurrency } from '../utils/currency';
import { getAvailableFinancialYears, getCurrentFyStartYear } from '../utils/financialYear';
import { isPro, type Invoice, type Expense } from '../types';
import { enqueueSnackbar } from '../lib/snackbar';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const client = generateClient<Schema>();

type Props = TabScreenProps<'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const { profile, loading: profileLoading, fetchProfile } = useProfile();

  const {
    currentPackage,
    error: subscriptionError,
    isSubscriptionActive,
    purchaseCurrentPackage,
    purchaseLoading,
    restoreLoading,
    restorePurchases,
  } = useSubscription();
  const [selectedFyStart, setSelectedFyStart] = useState(getCurrentFyStartYear());
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [askAiOpen, setAskAiOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [proModalVisible, setProModalVisible] = useState(false);
  const [proModalReason, setProModalReason] = useState('');
  const [csvLoading, setCsvLoading] = useState(false);
  const [dialog, setDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string | null;
    destructive?: boolean;
    onConfirm?: () => void;
  }>({ visible: false, title: '', message: '' });

  const showDialog = useCallback((config: Omit<typeof dialog, 'visible'>) => {
    setDialog({ visible: true, ...config });
  }, []);

  const closeDialog = useCallback(() => {
    setDialog((current) => ({ ...current, visible: false }));
  }, []);

  const fyYears = getAvailableFinancialYears(4);
  const selectedFy = fyYears.find((fy) => fy.startYear === selectedFyStart) ?? fyYears[0];

  // Invoice + expense fetch is independent of profile — empty deps so the reference
  // is unconditionally stable and useFocusEffect fires on every focus event.
  const loadData = useCallback(async () => {
    const [invResult, expResult] = await Promise.all([
      client.models.Invoice.list({ limit: 1000 }),
      client.models.Expense.list({ limit: 1000 }),
    ]);
    if (invResult.data) setInvoices(invResult.data as unknown as Invoice[]);
    if (expResult.data) setExpenses(expResult.data as unknown as Expense[]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchProfile();
      void loadData();
    }, [fetchProfile, loadData])
  );

  const fyInvoices = invoices.filter((inv) => {
    const d = new Date(inv.createdAt ?? '');
    return d >= selectedFy.startDate && d < selectedFy.endDate;
  });
  const fyExpenses = expenses.filter((exp) => {
    const d = new Date(exp.date);
    return d >= selectedFy.startDate && d < selectedFy.endDate;
  });

  const income = fyInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const expenseTotal = fyExpenses.reduce((s, e) => s + e.amount, 0);
  const unpaidTotal = fyInvoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
  const unpaidCount = fyInvoices.filter((i) => i.status !== 'paid').length;
  const profit = income - expenseTotal;
  const currency = profile?.currency ?? 'USD';
  const userIsPro = (profile ? isPro(profile) : false) || isSubscriptionActive;
  const subscriptionPriceLabel = currentPackage?.product.priceString ?? null;
  const upgradeLabel = subscriptionPriceLabel ? `Subscribe ${subscriptionPriceLabel}` : 'Upgrade to Pro';

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchProfile(), loadData()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAiSummary = async () => {
    setAiLoading(true);
    try {
      const result = await client.queries.getAiSummary({
        fyStart: selectedFyStart,
        income,
        expenses: expenseTotal,
        profit,
        unpaidCount,
        unpaidTotal,
        currency,
      });
      if (result.data?.summary) {
        setAiSummary(result.data.summary);
      } else if (result.data?.error) {
        enqueueSnackbar('AI summary unavailable', { variant: 'error', description: result.data.error });
      }
    } catch (err) {
      enqueueSnackbar('Failed to get AI summary', { variant: 'error' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAskAi = async (question: string) => {
    setAiAnswer(null);
    setAiError(null);
    setAiLoading(true);
    try {
      const result = await client.queries.askAi({
        fyStart: selectedFyStart,
        question,
        income,
        expenses: expenseTotal,
        profit,
        unpaidCount,
        unpaidTotal,
        currency,
      });
      if (result.data?.answer) {
        setAiAnswer(result.data.answer);
      } else if (result.data?.error) {
        setAiError(result.data.error);
      } else {
        setAiError('No answer came back. Try asking again.');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to ask AI');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCsvExport = async () => {
    if (!userIsPro) {
      setProModalReason(subscriptionError ?? 'CSV export is available on the Pro plan.');
      setProModalVisible(true);
      return;
    }
    setCsvLoading(true);
    try {
      const result = await client.queries.exportCsv({ fyStart: selectedFyStart });
      if (result.data?.error === 'pro_required') {
        setProModalReason(subscriptionError ?? 'CSV export is available on the Pro plan.');
        setProModalVisible(true);
        return;
      }
      const content = result.data?.content;
      if (!content) throw new Error('No CSV data returned');
      const path = `${FileSystem.cacheDirectory}export-${selectedFyStart}-${selectedFyStart + 1}.csv`;
      await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
      enqueueSnackbar('CSV exported', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Export failed', { variant: 'error', description: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setCsvLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      await purchaseCurrentPackage();
      setProModalVisible(false);
      await loadData();
      enqueueSnackbar('Subscription activated', { variant: 'success' });
    } catch (err) {
      const userCancelled = typeof err === 'object' && err !== null && 'userCancelled' in err && (err as { userCancelled?: boolean }).userCancelled;
      if (userCancelled) return;
      enqueueSnackbar('Upgrade failed', { variant: 'error', description: err instanceof Error ? err.message : 'Upgrade failed' });
    }
  };

  const handleRestorePurchases = async () => {
    try {
      await restorePurchases();
      await loadData();
      enqueueSnackbar('Purchases restored', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Restore failed', { variant: 'error', description: err instanceof Error ? err.message : 'Restore failed' });
    }
  };


  if (profileLoading && !profile) return <LoadingSpinner fullScreen />;

  const recentInvoices = [...fyInvoices].sort((a, b) => (b.createdAt ?? '') > (a.createdAt ?? '') ? 1 : -1).slice(0, 3);
  const recentExpenses = [...fyExpenses].sort((a, b) => (b.createdAt ?? '') > (a.createdAt ?? '') ? 1 : -1).slice(0, 3);

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Dashboard</Text>
            {profile?.businessName && (
              <Text style={styles.businessName}>{profile.businessName}</Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => (navigation as any).navigate('Settings')}
            >
              <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => (navigation as any).navigate('Account')}
            >
              <Ionicons name="person-circle-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pro / Founding Member badge */}
        {profile && (
          <View style={[styles.planBadge, userIsPro ? styles.proBadge : styles.freeBadge]}>
            <Ionicons
              name={userIsPro ? 'star' : 'star-outline'}
              size={14}
              color={userIsPro ? colors.warning : colors.textSecondary}
            />
            <Text style={[styles.planBadgeText, { color: userIsPro ? colors.warning : colors.textSecondary }]}>
              {profile.isFoundingMember ? 'Founding member — Pro forever' : userIsPro ? 'Pro plan' : 'Free plan'}
            </Text>
          </View>
        )}

        {profile && !userIsPro && (
          <View style={styles.upgradeCard}>
            <View style={styles.upgradeCardHeader}>
              <Ionicons name="rocket-outline" size={18} color={colors.primary} />
              <Text style={styles.upgradeCardTitle}>Upgrade to Pro</Text>
            </View>
            <Text style={styles.upgradeCardText}>
              Unlock unlimited invoices and CSV export with the same RevenueCat subscription flow on iOS and Android.
            </Text>
            <TouchableOpacity
              style={[globalStyles.primaryButton, styles.upgradeCardButton, purchaseLoading && styles.disabled]}
              onPress={handleUpgrade}
              disabled={purchaseLoading}
            >
              {purchaseLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={globalStyles.primaryButtonText}>
                  {upgradeLabel}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Financial year selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fySelector}>
          {fyYears.map((fy) => (
            <TouchableOpacity
              key={fy.startYear}
              style={[styles.fyChip, selectedFyStart === fy.startYear && styles.fyChipActive]}
              onPress={() => { setSelectedFyStart(fy.startYear); setAiSummary(null); setAiAnswer(null); setAiError(null); }}
            >
              <Text style={[styles.fyChipText, selectedFyStart === fy.startYear && styles.fyChipTextActive]}>
                {fy.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Stats grid */}
        <View style={styles.statsRow}>
          <StatCard label="Income" value={formatCurrency(income, currency)} accent="success" />
          <StatCard label="Expenses" value={formatCurrency(expenseTotal, currency)} accent="error" />
        </View>
        <View style={[styles.statsRow, { marginTop: spacing.sm }]}>
          <StatCard label="Profit" value={formatCurrency(profit, currency)} accent={profit >= 0 ? 'success' : 'error'} />
          <StatCard label="Unpaid" value={formatCurrency(unpaidTotal, currency)} subtitle={`${unpaidCount} invoice${unpaidCount !== 1 ? 's' : ''}`} accent="warning" />
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, csvLoading && styles.disabled]}
            onPress={handleCsvExport}
            disabled={csvLoading}
          >
            {csvLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="download-outline" size={16} color={colors.primary} />
            )}
            <Text style={styles.actionBtnText}>CSV export</Text>
            {!userIsPro && <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, aiLoading && styles.disabled]}
            onPress={handleAiSummary}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
            )}
            <Text style={styles.actionBtnText}>AI summary</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.askAiCard, aiLoading && styles.disabled]}
          onPress={() => setAskAiOpen(true)}
          disabled={aiLoading}
        >
          <View style={styles.askAiIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.askAiCopy}>
            <Text style={styles.askAiTitle}>Ask AI about {selectedFy.label}</Text>
            <Text style={styles.askAiText}>Ask about cash flow, unpaid invoices, profit, or where to focus next.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* AI Summary */}
        {aiSummary && (
          <View style={styles.aiCard}>
            <View style={styles.aiCardHeader}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={styles.aiCardTitle}>AI financial summary</Text>
            </View>
            <Text style={styles.aiCardText}>{aiSummary}</Text>
          </View>
        )}

        {/* Recent invoices */}
        <View style={globalStyles.sectionHeader}>
          <Text style={globalStyles.sectionTitle}>Recent invoices</Text>
          <TouchableOpacity onPress={() => (navigation as any).navigate('Invoices')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {recentInvoices.length === 0 ? (
          <Text style={styles.emptyText}>No invoices for {selectedFy.label}</Text>
        ) : (
          recentInvoices.map((inv) => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              currencyCode={currency}
              onPress={() => (navigation as any).navigate('InvoiceDetail', { invoiceId: inv.id })}
            />
          ))
        )}

        {/* Recent expenses */}
        <View style={globalStyles.sectionHeader}>
          <Text style={globalStyles.sectionTitle}>Recent expenses</Text>
          <TouchableOpacity onPress={() => (navigation as any).navigate('Expenses')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {recentExpenses.length === 0 ? (
          <Text style={styles.emptyText}>No expenses for {selectedFy.label}</Text>
        ) : (
          recentExpenses.map((exp) => (
            <ExpenseCard key={exp.id} expense={exp} currencyCode={currency} />
          ))
        )}
      </ScrollView>

      <ProModal
        visible={proModalVisible}
        reason={proModalReason}
        loading={purchaseLoading}
        onUpgrade={handleUpgrade}
        onClose={() => setProModalVisible(false)}
        closeLabel="Maybe later"
        upgradeLabel={upgradeLabel}
        priceLabel={subscriptionPriceLabel}
        secondaryActionLabel="Restore purchases"
        secondaryActionLoading={restoreLoading}
        onSecondaryAction={handleRestorePurchases}
      />

      <AskAiModal
        visible={askAiOpen}
        answer={aiAnswer}
        error={aiError}
        loading={aiLoading}
        financialYearLabel={selectedFy.label}
        onAsk={handleAskAi}
        onClose={() => setAskAiOpen(false)}
      />

      <ConfirmModal
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        confirmLabel={dialog.confirmLabel}
        cancelLabel={dialog.cancelLabel}
        destructive={dialog.destructive}
        onConfirm={dialog.onConfirm ?? closeDialog}
        onCancel={closeDialog}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: spacing['2xl'] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  greeting: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text },
  businessName: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  headerBtn: { padding: spacing.xs },
  planBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full,
    marginBottom: spacing.md, borderWidth: 1,
  },
  proBadge: { backgroundColor: colors.warningLight, borderColor: colors.warningBorder },
  freeBadge: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
  planBadgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  upgradeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  upgradeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.xs },
  upgradeCardTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  upgradeCardText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md },
  upgradeCardButton: { width: '100%' },
  fySelector: { marginBottom: spacing.md, flexGrow: 0 },
  fyChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: spacing.xs,
  },
  fyChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  fyChipText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSecondary },
  fyChipTextActive: { color: colors.white },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.sm + 2,
    borderWidth: 1, borderColor: colors.border,
  },
  actionBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  disabled: { opacity: 0.6 },
  askAiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  askAiIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askAiCopy: { flex: 1 },
  askAiTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  askAiText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18, marginTop: 2 },
  aiCard: {
    backgroundColor: colors.primaryLight, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs },
  aiCardTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  aiCardText: { fontSize: fontSize.base, color: colors.text, lineHeight: 22 },
  seeAll: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
});
