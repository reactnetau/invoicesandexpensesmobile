import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AuthScreenProps } from '../navigation/types';
import { colors, fontSize, spacing, radius, shadow } from '../theme';

type Props = AuthScreenProps<'Landing'>;

const POPULAR_ACTIONS = ['Invoices', 'Expenses', 'Clients', 'CSV export'];

const STATS = [
  { value: '$0', label: 'Free to start' },
  { value: '5', label: 'Invoices free' },
  { value: '$7', label: 'Pro monthly' },
  { value: '50', label: 'Founder spots' },
];

const FEATURE_CARDS = [
  {
    icon: 'receipt-outline' as const,
    title: 'Send polished invoices',
    desc: 'Create client-ready invoices with public payment links and email delivery.',
  },
  {
    icon: 'pie-chart-outline' as const,
    title: 'Know your numbers',
    desc: 'Track expenses, income, unpaid invoices, and profit without spreadsheet drift.',
  },
  {
    icon: 'sparkles-outline' as const,
    title: 'Summaries on demand',
    desc: 'Turn your financial year into a clear snapshot when tax time comes around.',
  },
];

const ACTIVITY = [
  { title: 'Invoice sent', meta: 'Design retainer · $1,250', icon: 'paper-plane-outline' as const },
  { title: 'Expense logged', meta: 'Software · $49', icon: 'card-outline' as const },
  { title: 'Client added', meta: 'Aster Studio', icon: 'person-add-outline' as const },
];

export function LandingScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <View style={styles.nav}>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Ionicons name="receipt" size={18} color={colors.white} />
            </View>
            <Text style={styles.brandText}>Invoices & Expenses</Text>
          </View>
          <TouchableOpacity style={styles.navLogin} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.navLoginText}>Sign in</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <View style={styles.kicker}>
            <Ionicons name="flash-outline" size={13} color={colors.primaryDark} />
            <Text style={styles.kickerText}>Freelance finance</Text>
          </View>

          <Text style={styles.title}>
            Invoices, expenses, and profit in one calm place
          </Text>
          <Text style={styles.subtitle}>
            Send invoices, record costs, and see what you actually earned without wrestling a spreadsheet.
          </Text>

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Signup')}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>Create free account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.9}
            >
              <Text style={styles.secondaryButtonText}>Sign in</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.popularRow}>
            <Text style={styles.popularLabel}>Built for:</Text>
            {POPULAR_ACTIONS.map((action) => (
              <View key={action} style={styles.popularPill}>
                <Text style={styles.popularPillText}>{action}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.statsBand}>
          {STATS.map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Daily workflow</Text>
            <Text style={styles.sectionTitle}>Everything stays tidy</Text>
          </View>
        </View>

        <View style={styles.featureGrid}>
          {FEATURE_CARDS.map((feature) => (
            <View key={feature.title} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={20} color={colors.primary} />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.desc}</Text>
            </View>
          ))}
        </View>

        <View style={styles.darkPanel}>
          <View style={styles.darkHeader}>
            <View style={styles.darkKicker}>
              <Ionicons name="trending-up-outline" size={13} color="#93C5FD" />
              <Text style={styles.darkKickerText}>Live snapshot</Text>
            </View>
            <Text style={styles.darkTitle}>Your week at a glance</Text>
            <Text style={styles.darkSubtitle}>
              A simple activity feed keeps the admin work visible and under control.
            </Text>
          </View>

          <View style={styles.activityList}>
            {ACTIVITY.map((item) => (
              <View key={item.title} style={styles.activityRow}>
                <View style={styles.activityIcon}>
                  <Ionicons name={item.icon} size={17} color="#BFDBFE" />
                </View>
                <View style={styles.activityCopy}>
                  <Text style={styles.activityTitle}>{item.title}</Text>
                  <Text style={styles.activityMeta}>{item.meta}</Text>
                </View>
                <Text style={styles.activityTime}>now</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.pricingPanel}>
          <View style={styles.pricingHeader}>
            <Text style={styles.sectionEyebrow}>Simple pricing</Text>
            <Text style={styles.sectionTitle}>Start free, grow when ready</Text>
          </View>

          <View style={styles.planRow}>
            <View style={styles.planBox}>
              <Text style={styles.planName}>Free</Text>
              <Text style={styles.planPrice}>$0</Text>
              <Text style={styles.planDesc}>5 invoices every month</Text>
            </View>

            <View style={[styles.planBox, styles.proBox]}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Popular</Text>
              </View>
              <Text style={[styles.planName, styles.proText]}>Pro</Text>
              <Text style={[styles.planPrice, styles.proText]}>$7/mo</Text>
              <Text style={styles.planDesc}>Unlimited invoices and CSV export</Text>
            </View>
          </View>

          <Text style={styles.foundingNote}>
            First 50 users get permanent Pro free as founding members.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => navigation.navigate('Signup')}
          activeOpacity={0.9}
        >
          <Text style={styles.footerButtonText}>Get started</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandText: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  navLogin: {
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.26)',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  navLoginText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600' },
  hero: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.lg },
  kicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0E7FF',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  kickerText: {
    color: '#3730A3',
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    lineHeight: 25,
    textAlign: 'center',
    maxWidth: 340,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
    alignSelf: 'stretch',
  },
  primaryButton: {
    flex: 1.25,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadow.md,
  },
  primaryButtonText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  secondaryButton: {
    flex: 0.75,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.text, fontSize: fontSize.base, fontWeight: '600' },
  popularRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  popularLabel: { color: colors.textMuted, fontSize: fontSize.xs },
  popularPill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 8,
  },
  popularPillText: { color: colors.primary, fontSize: fontSize.xs, fontWeight: '700' },
  statsBand: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    marginHorizontal: -spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
  },
  statItem: { width: '50%', alignItems: 'center', paddingVertical: spacing.sm },
  statValue: { color: colors.primary, fontSize: fontSize['2xl'], fontWeight: '800' },
  statLabel: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  sectionHeader: { marginBottom: spacing.md },
  sectionEyebrow: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '800' },
  featureGrid: { gap: spacing.md, marginBottom: spacing.xl },
  featureCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.lg,
    ...shadow.sm,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  featureTitle: { color: colors.text, fontSize: fontSize.base, fontWeight: '800', marginBottom: spacing.xs },
  featureDesc: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 },
  darkPanel: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  darkHeader: { marginBottom: spacing.lg },
  darkKicker: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  darkKickerText: { color: '#BFDBFE', fontSize: fontSize.xs, fontWeight: '800', textTransform: 'uppercase' },
  darkTitle: { color: colors.white, fontSize: fontSize.xl, fontWeight: '800', marginBottom: spacing.sm },
  darkSubtitle: { color: '#CBD5E1', fontSize: fontSize.sm, lineHeight: 21 },
  activityList: { gap: spacing.sm },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(51, 65, 85, 0.65)',
    borderRadius: 8,
    padding: spacing.md,
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(37, 99, 235, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  activityCopy: { flex: 1 },
  activityTitle: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700' },
  activityMeta: { color: '#94A3B8', fontSize: fontSize.xs, marginTop: 2 },
  activityTime: { color: '#64748B', fontSize: fontSize.xs },
  pricingPanel: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.sm,
  },
  pricingHeader: { marginBottom: spacing.md },
  planRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  planBox: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 120,
  },
  proBox: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginBottom: spacing.sm,
  },
  badgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '800' },
  planName: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '700' },
  planPrice: { color: colors.text, fontSize: fontSize.xl, fontWeight: '800', marginVertical: 4 },
  proText: { color: colors.primary },
  planDesc: { color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 17 },
  foundingNote: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
  footerButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadow.md,
  },
  footerButtonText: { color: colors.white, fontSize: fontSize.base, fontWeight: '800' },
});
