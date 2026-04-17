/**
 * Shared include-fields section used on both CreateInvoiceScreen and
 * InvoiceDetailScreen.
 *
 * Renders one toggle row per profile-backed field. Unavailable fields
 * (not yet set in Settings) are shown with a "· not set" hint and blocked
 * from being turned on — a modal prompts the user to visit Settings first.
 *
 * The caller owns the `includes` state and calls `onToggle(key)` to flip it.
 * The modal and field-availability checks are fully encapsulated here.
 */

import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { ConfirmModal } from './ConfirmModal';
import { colors, fontSize, spacing } from '../theme';
import type { UserProfile } from '../types';

// ── Shared types & constants ─────────────────────────────────────────────────

export interface IncludeFields {
  businessName: boolean;
  fullName: boolean;
  phone: boolean;
  address: boolean;
  abn: boolean;
  payid: boolean;
}

export const INCLUDE_FIELDS_DEFAULT: IncludeFields = {
  businessName: true,
  fullName: false,
  phone: false,
  address: false,
  abn: false,
  payid: false,
};

export type FieldDef = { key: keyof IncludeFields; label: string; available: boolean };

/**
 * Returns the availability-annotated field list for a given profile.
 * PayID is always treated as available because it is stored encrypted
 * and cannot be read client-side without a separate query.
 */
export function getIncludeFieldDefs(profile: UserProfile | null): FieldDef[] {
  return [
    { key: 'businessName', label: 'Business name', available: !!profile?.businessName },
    { key: 'fullName',     label: 'Full name',      available: !!profile?.fullName },
    { key: 'phone',        label: 'Phone number',   available: !!profile?.phone },
    { key: 'address',      label: 'Address',        available: !!profile?.address },
    { key: 'abn',          label: 'ABN',            available: !!profile?.abn },
    { key: 'payid',        label: 'PayID',          available: true },
  ];
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  profile: UserProfile | null;
  includes: IncludeFields;
  /** Called only when the toggle flip is valid (field available, or turning off). */
  onToggle: (key: keyof IncludeFields) => void;
  /** Called when the user taps "Go to Settings" inside the missing-field modal. */
  onNavigateToSettings: () => void;
}

export function IncludeFieldsSection({ profile, includes, onToggle, onNavigateToSettings }: Props) {
  const [missingField, setMissingField] = useState<{ label: string } | null>(null);

  const fieldDefs = getIncludeFieldDefs(profile);

  const handleToggle = (key: keyof IncludeFields, available: boolean) => {
    if (!includes[key] && !available) {
      // User is trying to turn ON a field they haven't set up yet.
      const field = fieldDefs.find((f) => f.key === key);
      setMissingField({ label: field?.label ?? key });
      return;
    }
    onToggle(key);
  };

  return (
    <>
      {fieldDefs.map((f) => (
        <View key={f.key} style={styles.includeRow}>
          <Text style={[styles.includeLabel, !f.available && styles.includeLabelMuted]}>
            {f.label}
            {!f.available && <Text style={styles.includeNotSet}> · not set</Text>}
          </Text>
          <Switch
            value={f.available && includes[f.key]}
            onValueChange={() => handleToggle(f.key, f.available)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      ))}

      <ConfirmModal
        visible={!!missingField}
        title={`${missingField?.label ?? 'Field'} not set`}
        message={`You haven't added your ${missingField?.label?.toLowerCase() ?? 'field'} yet. Add it in Settings before including it on invoices.`}
        confirmLabel="Go to Settings"
        cancelLabel="Not now"
        onConfirm={() => {
          setMissingField(null);
          onNavigateToSettings();
        }}
        onCancel={() => setMissingField(null)}
      />
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  includeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  includeLabel: {
    fontSize: fontSize.base,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  includeLabelMuted: { color: colors.textMuted },
  includeNotSet: { fontSize: fontSize.xs, color: colors.textMuted },
});
