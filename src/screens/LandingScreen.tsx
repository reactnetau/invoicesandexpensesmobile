import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AuthScreenProps } from '../navigation/types';
import { colors, fontSize, spacing, radius } from '../theme';

type Props = AuthScreenProps<'Landing'>;

const FEATURES = [
  { icon: 'document-text-outline' as const, text: 'Create and send professional invoices' },
  { icon: 'receipt-outline' as const, text: 'Track expenses by category' },
  { icon: 'people-outline' as const, text: 'Manage your clients in one place' },
  { icon: 'trending-up-outline' as const, text: 'See income, expenses and profit at a glance' },
  { icon: 'sparkles-outline' as const, text: 'AI-powered financial year summaries' },
];

export function LandingScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="receipt" size={32} color={colors.primary} />
          </View>
          <Text style={styles.appName}>Invoices & Expenses</Text>
          <Text style={styles.tagline}>
            Simple invoicing and expense tracking{'\n'}for freelancers and contractors
          </Text>
        </View>

        {/* Feature list */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={18} color={colors.primary} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Pricing */}
        <View style={styles.pricingCard}>
          <View style={styles.pricingHeader}>
            <Text style={styles.pricingTitle}>Simple pricing</Text>
          </View>
          <View style={styles.pricingRow}>
            <View style={styles.planBox}>
              <Text style={styles.planName}>Free</Text>
              <Text style={styles.planPrice}>$0</Text>
              <Text style={styles.planDesc}>5 invoices/month</Text>
            </View>
            <View style={[styles.planBox, styles.proPlanBox]}>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>Popular</Text>
              </View>
              <Text style={[styles.planName, { color: colors.primary }]}>Pro</Text>
              <Text style={[styles.planPrice, { color: colors.primary }]}>$7/mo</Text>
              <Text style={styles.planDesc}>Unlimited invoices + CSV export</Text>
            </View>
          </View>
          <Text style={styles.foundingNote}>
            🎉 First 50 users get permanent Pro free — founding member offer
          </Text>
        </View>

        {/* CTA buttons */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.signupBtn}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={styles.signupBtnText}>Create free account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginBtnText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  header: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  appName: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  tagline: { fontSize: fontSize.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  features: { marginBottom: spacing.xl, gap: spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: { flex: 1, fontSize: fontSize.base, color: colors.text },
  pricingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  pricingHeader: { marginBottom: spacing.md },
  pricingTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  pricingRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  planBox: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  proPlanBox: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    position: 'relative',
  },
  proBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  proBadgeText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.white },
  planName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
  planPrice: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: 4 },
  planDesc: { fontSize: fontSize.xs, color: colors.textSecondary },
  foundingNote: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center' },
  ctaSection: { gap: spacing.sm },
  signupBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  signupBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  loginBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  loginBtnText: { color: colors.text, fontSize: fontSize.base, fontWeight: '500' },
});
