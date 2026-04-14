import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { generateClient } from 'aws-amplify/data';
import { deleteUser } from 'aws-amplify/auth';
import type { Schema } from '../types/amplify-schema';
import type { AppScreenProps } from '../navigation/types';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { colors, fontSize, spacing, radius, globalStyles, statusBadgeStyle } from '../theme';
import { formatDate } from '../utils/currency';
import { isPro } from '../types';
import * as WebBrowser from 'expo-web-browser';

const client = generateClient<Schema>();
type Props = AppScreenProps<'Account'>;

export function AccountScreen({ navigation }: Props) {
  const { profile, loading: profileLoading, deleteAccount, fetchProfile } = useProfile();
  const { logout } = useAuth();
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const result = await client.queries.stripeCreateCheckout();
      const url = result.data?.url;
      if (url) {
        await WebBrowser.openBrowserAsync(url);
        await fetchProfile();
      } else {
        Alert.alert('Error', result.data?.error ?? 'Failed to create checkout');
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Upgrade failed');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const result = await client.queries.stripeCreatePortal();
      const url = result.data?.url;
      if (url) {
        await WebBrowser.openBrowserAsync(url);
        await fetchProfile();
      } else {
        Alert.alert('Error', result.data?.error ?? 'Could not open billing portal');
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      const result = await client.mutations.stripeCancelSubscription();
      if (result.data?.ok) {
        Alert.alert('Subscription cancelled', 'Your Pro access will remain active until the end of the current billing period.');
        await fetchProfile();
      } else {
        Alert.alert('Error', result.data?.error ?? 'Cancellation failed');
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Cancellation failed');
    } finally {
      setCancelLoading(false);
      setCancelModal(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!profile) return;
    setDeleteLoading(true);
    try {
      // Delete all user data in Amplify Data
      const [invoices, expenses, clients] = await Promise.all([
        client.models.Invoice.list(),
        client.models.Expense.list(),
        client.models.Client.list(),
      ]);
      await Promise.all([
        ...invoices.data.map((i) => client.models.Invoice.delete({ id: i.id })),
        ...expenses.data.map((e) => client.models.Expense.delete({ id: e.id })),
        ...clients.data.map((c) => client.models.Client.delete({ id: c.id })),
      ]);
      await deleteAccount(profile.id);
      // Delete Cognito user
      await deleteUser();
      // Logout cleans up local session
      await logout();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Account deletion failed');
      setDeleteLoading(false);
      setDeleteModal(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
    } finally {
      setLogoutLoading(false);
    }
  };

  if (profileLoading && !profile) return <LoadingSpinner fullScreen />;

  const userIsPro = profile ? isPro(profile) : false;
  const badge = statusBadgeStyle(profile?.subscriptionStatus ?? 'inactive');

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile summary */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.email ?? 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.email}>{profile?.email}</Text>
            {profile?.businessName && (
              <Text style={styles.business}>{profile.businessName}</Text>
            )}
          </View>
        </View>

        {/* Subscription status */}
        <View style={globalStyles.card}>
          <View style={globalStyles.rowBetween}>
            <Text style={styles.cardTitle}>Subscription</Text>
            <View style={[globalStyles.badge, { backgroundColor: badge.bg, borderColor: badge.border, borderWidth: 1 }]}>
              <Text style={[globalStyles.badgeText, { color: badge.text }]}>
                {profile?.isFoundingMember ? 'Founding member' : userIsPro ? 'Pro' : 'Free'}
              </Text>
            </View>
          </View>

          {profile?.subscriptionEndDate && (
            <Text style={styles.subDetail}>
              {userIsPro ? 'Renews' : 'Access until'}: {formatDate(profile.subscriptionEndDate)}
            </Text>
          )}

          {!userIsPro && !profile?.isFoundingMember && (
            <>
              <Text style={styles.freeInfo}>
                Free plan: 5 invoices/month. Upgrade for unlimited invoices and CSV export.
              </Text>
              <TouchableOpacity
                style={[globalStyles.primaryButton, { marginTop: spacing.md }, upgradeLoading && { opacity: 0.6 }]}
                onPress={handleUpgrade}
                disabled={upgradeLoading}
              >
                {upgradeLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={globalStyles.primaryButtonText}>Upgrade to Pro — $7/month</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {userIsPro && !profile?.isFoundingMember && (
            <View style={styles.proActions}>
              <TouchableOpacity
                style={[globalStyles.secondaryButton, { flex: 1 }, portalLoading && { opacity: 0.6 }]}
                onPress={handlePortal}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Text style={globalStyles.secondaryButtonText}>Manage billing</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[globalStyles.dangerButton, { flex: 1 }, cancelLoading && { opacity: 0.6 }]}
                onPress={() => setCancelModal(true)}
                disabled={cancelLoading}
              >
                <Text style={globalStyles.dangerButtonText}>Cancel plan</Text>
              </TouchableOpacity>
            </View>
          )}

          {profile?.isFoundingMember && (
            <View style={styles.foundingBadge}>
              <Ionicons name="star" size={14} color={colors.warning} />
              <Text style={styles.foundingText}>
                You have permanent Pro access as a founding member. Thank you for being an early supporter!
              </Text>
            </View>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[globalStyles.secondaryButton, logoutLoading && { opacity: 0.6 }]}
          onPress={handleLogout}
          disabled={logoutLoading}
        >
          {logoutLoading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={globalStyles.secondaryButtonText}>Sign out</Text>
          )}
        </TouchableOpacity>

        {/* Delete account */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>Danger zone</Text>
          <TouchableOpacity
            style={globalStyles.dangerButton}
            onPress={() => setDeleteModal(true)}
          >
            <Text style={globalStyles.dangerButtonText}>Delete account</Text>
          </TouchableOpacity>
          <Text style={styles.dangerNote}>
            This permanently deletes your account, all invoices, expenses, and client data. This cannot be undone.
          </Text>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={cancelModal}
        title="Cancel subscription?"
        message="Your Pro access will continue until the end of the current billing period. You can re-subscribe at any time."
        confirmLabel="Cancel plan"
        destructive
        loading={cancelLoading}
        onConfirm={handleCancel}
        onCancel={() => setCancelModal(false)}
      />

      <ConfirmModal
        visible={deleteModal}
        title="Delete account?"
        message="All your invoices, expenses, clients, and account data will be permanently deleted. This cannot be undone."
        confirmLabel="Delete everything"
        destructive
        loading={deleteLoading}
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: spacing['2xl'], gap: spacing.md },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary },
  email: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  business: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  cardTitle: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  subDetail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  freeInfo: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 20 },
  proActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  foundingBadge: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    backgroundColor: colors.warningLight, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.md,
  },
  foundingText: { flex: 1, fontSize: fontSize.sm, color: colors.warning, lineHeight: 18 },
  dangerZone: {
    backgroundColor: colors.errorLight, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.errorBorder, gap: spacing.sm,
  },
  dangerZoneTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.error },
  dangerNote: { fontSize: fontSize.xs, color: colors.error, lineHeight: 18 },
});
