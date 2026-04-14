import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { TabScreenProps } from '../navigation/types';
import { useProfile } from '../hooks/useProfile';
import { ExpenseCard } from '../components/ExpenseCard';
import { EmptyState } from '../components/EmptyState';
import { ConfirmModal } from '../components/ConfirmModal';
import { StatCard } from '../components/StatCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { colors, fontSize, spacing, globalStyles } from '../theme';
import { formatCurrency } from '../utils/currency';
import { type Expense } from '../types';

const client = generateClient<Schema>();
type Props = TabScreenProps<'Expenses'>;

export function ExpensesScreen({ navigation }: Props) {
  const { profile } = useProfile();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadExpenses = useCallback(async () => {
    const result = await client.models.Expense.list();
    const sorted = [...(result.data ?? [])].sort(
      (a, b) => (b.date ?? '') > (a.date ?? '') ? 1 : -1
    );
    setExpenses(sorted as unknown as Expense[]);
  }, []);

  useEffect(() => {
    loadExpenses().finally(() => setLoading(false));
  }, [loadExpenses]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadExpenses();
    setRefreshing(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await client.models.Expense.delete({ id: deleteTarget });
      setExpenses((prev) => prev.filter((e) => e.id !== deleteTarget));
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const currency = profile?.currency ?? 'USD';
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Expenses</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => (navigation as any).navigate('AddExpense')}
        >
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {expenses.length > 0 && (
        <View style={styles.totalRow}>
          <StatCard label="Total expenses" value={formatCurrency(total, currency)} accent="error" />
        </View>
      )}

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No expenses yet"
            subtitle="Track your business expenses to see profit on the dashboard."
            actionLabel="Add expense"
            onAction={() => (navigation as any).navigate('AddExpense')}
          />
        }
        renderItem={({ item }) => (
          <ExpenseCard
            expense={item}
            currencyCode={currency}
            onDelete={() => setDeleteTarget(item.id)}
          />
        )}
      />

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete expense?"
        message="This will permanently delete this expense. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
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
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  totalRow: { paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  list: { padding: spacing.md, paddingTop: 0, paddingBottom: spacing['2xl'] },
});
