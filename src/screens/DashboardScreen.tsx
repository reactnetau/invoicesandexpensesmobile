import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../types/amplify-schema';
import type { TabScreenProps } from '../navigation/types';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';
import { StatCard } from '../components/StatCard';
import { InvoiceCard } from '../components/InvoiceCard';
import { ExpenseCard } from '../components/ExpenseCard';
import { ProModal } from '../components/ProModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { colors, fontSize, spacing, radius, globalStyles } from '../theme';
import { formatCurrency } from '../utils/currency';
import { getAvailableFinancialYears, getCurrentFyStartYear } from '../utils/financialYear';
import { isPro, type Invoice, type Expense } from '../types';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

const client = generateClient<Schema>();

type Props = TabScreenProps<'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const { profile, loading: profileLoading, fetchProfile } = useProfile();
  const { logout } = useAuth();
  const [selectedFyStart, setSelectedFyStart] = useState(getCurrentFyStartYear());
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [proModalVisible, setProModalVisible] = useState(false);
  const [proModalReason, setProModalReason] = useState('');
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const fyYears = getAvailableFinancialYears(4);
  const selectedFy = fyYears.find((fy) => fy.startYear === selectedFyStart) ?? fyYears[0];

  const loadData = useCallback(async () => {
    await fetchProfile();
    const [invResult, expResult] = await Promise.all([
      client.models.Invoice.list(),
      client.models.Expense.list(),
    ]);
    setInvoices((invResult.data ?? []) as unknown as Invoice[]);
    setExpenses((expResult.data ?? []) as unknown as Expense[]);
  }, [fetchProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
  const userIsPro = profile ? isPro(profile) : false;

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAiSummary = async () => {
    setAiLoading(true);
    try {
      const result = await client.queries.getAiSummary({ fyStart: selectedFyStart });
      if (result.data?.summary) {
        setAiSummary(result.data.summary);
      } else if (result.data?.error) {
        Alert.alert('AI summary unavailable', result.data.error);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to get AI summary');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCsvExport = async () => {
    if (!userIsPro) {
      setProModalReason('CSV export is available on the Pro plan.');
      setProModalVisible(true);
      return;
    }
    setCsvLoading(true);
    try {
      const result = await client.queries.exportCsv({ fyStart: selectedFyStart });
      if (result.data?.error === 'pro_required') {
        setProModalReason('CSV export is available on the Pro plan.');
        setProModalVisible(true);
        return;
      }
      const content = result.data?.content;
      if (!content) throw new Error('No CSV data returned');
      const path = `${FileSystem.cacheDirectory}export-${selectedFyStart}-${selectedFyStart + 1}.csv`;
      await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const result = await client.queries.stripeCreateCheckout();
      const url = result.data?.url;
      if (url) {
        await WebBrowser.openBrowserAsync(url);
        setProModalVisible(false);
        await loadData();
      } else {
        Alert.alert('Error', result.data?.error ?? 'Failed to create checkout session');
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Upgrade failed');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setLogoutLoading(true);
          try {
            await logout();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Sign out failed');
          } finally {
            setLogoutLoading(false);
          }
        },
      },
    ]);
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
              style={[styles.headerBtn, logoutLoading && styles.disabled]}
              onPress={handleLogout}
              disabled={logoutLoading}
            >
              {logoutLoading ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
              )}
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
            {!userIsPro && (
              <TouchableOpacity onPress={() => { setProModalReason(''); setProModalVisible(true); }}>
                <Text style={styles.upgradeLink}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Financial year selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fySelector}>
          {fyYears.map((fy) => (
            <TouchableOpacity
              key={fy.startYear}
              style={[styles.fyChip, selectedFyStart === fy.startYear && styles.fyChipActive]}
              onPress={() => { setSelectedFyStart(fy.startYear); setAiSummary(null); }}
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
        loading={upgradeLoading}
        onUpgrade={handleUpgrade}
        onClose={() => setProModalVisible(false)}
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
  upgradeLink: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary, marginLeft: 4 },
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
