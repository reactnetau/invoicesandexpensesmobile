import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { TabScreenProps } from '../navigation/types';
import { ClientCard } from '../components/ClientCard';
import { EmptyState } from '../components/EmptyState';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { colors, fontSize, spacing, globalStyles } from '../theme';
import { type Client } from '../types';

const client = generateClient<Schema>();
type Props = TabScreenProps<'Clients'>;

export function ClientsScreen({ navigation }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadClients = useCallback(async () => {
    const result = await client.models.Client.list();
    const sorted = [...(result.data ?? [])].sort(
      (a, b) => a.name.localeCompare(b.name)
    );
    setClients(sorted as unknown as Client[]);
  }, []);

  useEffect(() => {
    loadClients().finally(() => setLoading(false));
  }, [loadClients]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadClients();
    setRefreshing(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await client.models.Client.delete({ id: deleteTarget });
      setClients((prev) => prev.filter((c) => c.id !== deleteTarget));
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Clients</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => (navigation as any).navigate('AddEditClient', {})}
        >
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No clients yet"
            subtitle="Add clients so you can quickly select them when creating invoices."
            actionLabel="Add client"
            onAction={() => (navigation as any).navigate('AddEditClient', {})}
          />
        }
        renderItem={({ item }) => (
          <ClientCard
            client={item}
            onPress={() => (navigation as any).navigate('AddEditClient', { clientId: item.id })}
            onDelete={() => setDeleteTarget(item.id)}
          />
        )}
      />

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete client?"
        message="This will remove the client from your list. Existing invoices linked to this client will not be affected."
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
  list: { padding: spacing.md, paddingTop: 0, paddingBottom: spacing['2xl'] },
});
