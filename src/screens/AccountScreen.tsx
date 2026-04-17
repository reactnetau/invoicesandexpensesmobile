import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { generateClient } from 'aws-amplify/data';
import { deleteUser } from 'aws-amplify/auth';
import type { Schema } from '../types/amplify-schema';
import type { AppScreenProps } from '../navigation/types';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../providers/SubscriptionProvider';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { colors, fontSize, spacing, radius, globalStyles, statusBadgeStyle } from '../theme';
import { formatDate } from '../utils/currency';
import { isPro } from '../types';
import { enqueueSnackbar } from '../lib/snackbar';

const client = generateClient<Schema>();
type Props = AppScreenProps<'Account'>;

export function AccountScreen({ navigation }: Props) {
  const { profile, loading: profileLoading, deleteAccount, fetchProfile } = useProfile();
  const { logout } = useAuth();
  const {
    activeEntitlement,
    currentPackage,
    error: subscriptionError,
    loading: subscriptionLoading,
    purchaseCurrentPackage,
    purchaseLoading,
    restoreLoading,
    restorePurchases,
    isSubscriptionActive,
  } = useSubscription();
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleUpgrade = async () => {
    try {
      await purchaseCurrentPackage();
      await fetchProfile();
      enqueueSnackbar('Subscription activated', { variant: 'success' });
    } catch (err) {
      const userCancelled = typeof err === 'object' && err !== null && 'userCancelled' in err && (err as { userCancelled?: boolean }).userCancelled;
      if (userCancelled) return;
      enqueueSnackbar('Upgrade failed', { variant: 'error', description: err instanceof Error ? err.message : 'Upgrade failed' });
    }
  };

  const handleRestorePurchases = async () => {
    try {
      const customerInfo = await restorePurchases();
      await fetchProfile();
      const hasActiveEntitlement = Object.keys(customerInfo?.entitlements.active ?? {}).length > 0;
      if (hasActiveEntitlement) {
        enqueueSnackbar('Purchases restored', { variant: 'success' });
      } else {
        enqueueSnackbar('No purchases to restore', { variant: 'info' });
      }
    } catch (err) {
      enqueueSnackbar('Restore failed', { variant: 'error', description: err instanceof Error ? err.message : 'Restore failed' });
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
      enqueueSnackbar('Account deletion failed', { variant: 'error', description: err instanceof Error ? err.message : 'Account deletion failed' });
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

  if ((profileLoading && !profile) || (subscriptionLoading && !profile)) return <LoadingSpinner fullScreen />;

  const userIsPro = (profile ? isPro(profile) : false) || isSubscriptionActive;
  const badge = statusBadgeStyle(userIsPro ? 'active' : profile?.subscriptionStatus ?? 'inactive');
  const subscriptionPriceLabel = currentPackage?.product.priceString ?? null;
  const upgradeLabel = subscriptionPriceLabel ? `Subscribe ${subscriptionPriceLabel}` : 'Subscribe to Pro';

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

          {subscriptionError && (
            <Text style={styles.freeInfo}>{subscriptionError}</Text>
          )}

          {!userIsPro && !profile?.isFoundingMember && (
            <>
              <Text style={styles.freeInfo}>
                Free plan: 5 invoices/month. Upgrade with RevenueCat to unlock unlimited invoices and CSV export on iOS and Android.
              </Text>
              <TouchableOpacity
                style={[globalStyles.primaryButton, { marginTop: spacing.md }, purchaseLoading && { opacity: 0.6 }]}
                onPress={handleUpgrade}
                disabled={purchaseLoading}
              >
                {purchaseLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={globalStyles.primaryButtonText}>{upgradeLabel}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[globalStyles.secondaryButton, { marginTop: spacing.sm }, restoreLoading && { opacity: 0.6 }]}
                onPress={handleRestorePurchases}
                disabled={restoreLoading}
              >
                {restoreLoading ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Text style={globalStyles.secondaryButtonText}>Restore purchases</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {userIsPro && !profile?.isFoundingMember && (
            <TouchableOpacity
              style={[globalStyles.secondaryButton, { marginTop: spacing.md }, restoreLoading && { opacity: 0.6 }]}
              onPress={handleRestorePurchases}
              disabled={restoreLoading}
            >
              {restoreLoading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={globalStyles.secondaryButtonText}>Restore purchases</Text>
              )}
            </TouchableOpacity>
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
            onPress={() => {
              if (activeEntitlement?.isActive) {
                enqueueSnackbar('Cancel your active subscription before deleting your account.', {
                  variant: 'error',
                  description: 'Go to Settings → Manage subscription to cancel first.',
                });
                return;
              }
              setDeleteModal(true);
            }}
          >
            <Text style={globalStyles.dangerButtonText}>Delete account</Text>
          </TouchableOpacity>
          <Text style={styles.dangerNote}>
            This permanently deletes your account, all invoices, expenses, and client data. This cannot be undone.
          </Text>
        </View>
      </ScrollView>
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
