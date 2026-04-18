import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Modal, FlatList, KeyboardAvoidingView, Platform,
  Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { generateClient } from 'aws-amplify/data';
import { fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import { uploadData, getUrl, remove } from 'aws-amplify/storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { Schema } from '../types/amplify-schema';
import type { AppScreenProps } from '../navigation/types';
import { useProfile } from '../hooks/useProfile';
import { ensureUserProfile } from '../services/profile';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CURRENCIES } from '../types';
import { colors, fontSize, spacing, radius, globalStyles } from '../theme';
import { enqueueSnackbar } from '../lib/snackbar';

const client = generateClient<Schema>();
type Props = AppScreenProps<'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { profile, loading: profileLoading, fetchProfile } = useProfile();
  const [saving, setSaving] = useState(false);
  const [payidSaving, setPayidSaving] = useState(false);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [payidLoading, setPayidLoading] = useState(false);
  const [payidDecrypted, setPayidDecrypted] = useState<string | null>(null);
  const [payidVisible, setPayidVisible] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);

  const [form, setForm] = useState({
    currency: 'AUD',
    businessName: '',
    fullName: '',
    phone: '',
    address: '',
    abn: '',
    newPayid: '',
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: 12 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) {
      setForm({
        currency: profile.currency ?? 'AUD',
        businessName: profile.businessName ?? '',
        fullName: profile.fullName ?? '',
        phone: profile.phone ?? '',
        address: profile.address ?? '',
        abn: profile.abn ?? '',
        newPayid: '',
      });
    }
  }, [profile]);

  // Fetch a short-lived signed URL whenever the stored logo key changes.
  useEffect(() => {
    if (!profile?.companyLogoKey) {
      setLogoUrl(null);
      return;
    }
    getUrl({ path: profile.companyLogoKey, options: { expiresIn: 3600, validateObjectExistence: false } })
      .then(({ url }) => setLogoUrl(url.toString()))
      .catch(() => setLogoUrl(null));
  }, [profile?.companyLogoKey]);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const uploadLogoFromUri = async (uri: string, mimeType: string) => {
    const session = await fetchAuthSession();
    const identityId = session.identityId;
    if (!identityId) throw new Error('No identity ID available');

    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const newPath = `logos/${identityId}/company_logo.${ext}`;
    const oldPath = profile!.companyLogoKey ?? null;

    const response = await fetch(uri);
    const blob = await response.blob();

    await uploadData({ path: newPath, data: blob, options: { contentType: mimeType } }).result;
    await client.models.UserProfile.update({ id: profile!.id, companyLogoKey: newPath } as any);

    if (oldPath && oldPath !== newPath) {
      try { await remove({ path: oldPath }); } catch { /* not fatal */ }
    }

    const { url } = await getUrl({ path: newPath, options: { expiresIn: 3600 } });
    setLogoUrl(url.toString());
    await fetchProfile();
    enqueueSnackbar('Logo uploaded', { variant: 'success' });
  };

  const pickFromPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      enqueueSnackbar('Permission required', {
        variant: 'error',
        description: 'Please allow photo library access in your device settings.',
      });
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    setLogoLoading(true);
    try {
      await uploadLogoFromUri(asset.uri, asset.mimeType ?? 'image/jpeg');
    } catch (err) {
      enqueueSnackbar('Upload failed', {
        variant: 'error',
        description: err instanceof Error ? err.message : 'Failed to upload logo',
      });
    } finally {
      setLogoLoading(false);
    }
  };

  const pickFromFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setLogoLoading(true);
    try {
      await uploadLogoFromUri(asset.uri, asset.mimeType ?? 'image/jpeg');
    } catch (err) {
      enqueueSnackbar('Upload failed', {
        variant: 'error',
        description: err instanceof Error ? err.message : 'Failed to upload logo',
      });
    } finally {
      setLogoLoading(false);
    }
  };

  const handlePickLogo = () => {
    if (!profile) return;
    Alert.alert('Choose logo', 'Select image source', [
      { text: 'Photos', onPress: pickFromPhotos },
      { text: 'Files', onPress: pickFromFiles },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleRemoveLogo = () => {
    if (!profile?.companyLogoKey) return;
    Alert.alert(
      'Remove logo',
      'Your company logo will be removed from future invoice PDFs.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLogoLoading(true);
            try {
              // Best-effort S3 delete — don't block the UI if it fails
              try { await remove({ path: profile.companyLogoKey! }); } catch { /* not fatal */ }
              await client.models.UserProfile.update({ id: profile.id, companyLogoKey: null } as any);
              setLogoUrl(null);
              await fetchProfile();
              enqueueSnackbar('Logo removed', { variant: 'success' });
            } catch (err) {
              enqueueSnackbar('Failed to remove logo', {
                variant: 'error',
                description: err instanceof Error ? err.message : 'Failed to remove logo',
              });
            } finally {
              setLogoLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      // Use null (not undefined) for cleared fields so Amplify sends an explicit
      // null to DynamoDB and overwrites the previous value.  Passing undefined
      // would omit the key entirely, leaving the old value in place.
      await client.models.UserProfile.update({
        id: profile.id,
        currency: form.currency,
        businessName: form.businessName.trim() || null,
        fullName:     form.fullName.trim()     || null,
        phone:        form.phone.trim()        || null,
        address:      form.address.trim()      || null,
        abn:          form.abn.trim()          || null,
      } as any);
      await fetchProfile();
      enqueueSnackbar('Settings updated', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Save failed', { variant: 'error', description: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleRevealPayid = async () => {
    setPayidLoading(true);
    try {
      const result = await client.queries.getDecryptedPayid();
      setPayidDecrypted(result.data?.payid ?? null);
      setPayidVisible(true);
    } catch (err) {
      enqueueSnackbar('Failed to retrieve PayID', { variant: 'error' });
    } finally {
      setPayidLoading(false);
    }
  };

  const ensureProfileForCurrentUser = async () => {
    const attributes = await fetchUserAttributes();
    const email = attributes.email ?? profile?.email;
    if (!email) {
      throw new Error('Could not find your account email. Please sign out and sign back in.');
    }

    await ensureUserProfile(email, form.currency);
    await fetchProfile();
  };

  const savePayid = async (payid: string) => {
    const result = await client.mutations.updateEncryptedPayid({ payid });
    return result.data ?? { ok: false, error: 'Failed to save PayID' };
  };

  const handleSavePayid = async () => {
    const newPayid = form.newPayid.trim();
    if (!newPayid) return;
    setPayidSaving(true);
    try {
      let result = await savePayid(newPayid);

      if (!result.ok && result.error === 'User profile not found') {
        await ensureProfileForCurrentUser();
        result = await savePayid(newPayid);
      }

      if (result.ok) {
        setPayidDecrypted(newPayid);
        setForm((prev) => ({ ...prev, newPayid: '' }));
        enqueueSnackbar('PayID updated', { variant: 'success' });
      } else {
        enqueueSnackbar('Failed to save PayID', { variant: 'error', description: result.error ?? 'Failed to save PayID' });
      }
    } catch (err) {
      enqueueSnackbar('Failed to save PayID', { variant: 'error', description: err instanceof Error ? err.message : 'Failed to save PayID' });
    } finally {
      setPayidSaving(false);
    }
  };

  if (profileLoading && !profile) return <LoadingSpinner fullScreen />;

  const selectedCurrency = CURRENCIES.find((c) => c.code === form.currency);

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.readonlyRow}>
            <Text style={styles.readonlyLabel}>Email</Text>
            <Text style={styles.readonlyValue}>{profile?.email ?? '—'}</Text>
          </View>

          <View style={globalStyles.divider} />
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={globalStyles.inputContainer}>
            <Text style={globalStyles.label}>Currency</Text>
            <TouchableOpacity
              style={[globalStyles.input, styles.pickerBtn]}
              onPress={() => setCurrencyPickerOpen(true)}
            >
              <Text style={{ color: colors.text }}>{selectedCurrency?.label ?? form.currency}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={globalStyles.divider} />
          <Text style={styles.sectionTitle}>Business details</Text>
          <Text style={styles.sectionSubtitle}>These appear on your invoice PDFs when selected.</Text>

          {[
            { label: 'Business name', key: 'businessName' as const, placeholder: 'Acme Pty Ltd' },
            { label: 'Full name', key: 'fullName' as const, placeholder: 'Jane Smith' },
            { label: 'Phone', key: 'phone' as const, placeholder: '+61 400 000 000', keyboardType: 'phone-pad' as const },
            { label: 'Address', key: 'address' as const, placeholder: '123 Main St, Sydney NSW 2000' },
            { label: 'ABN', key: 'abn' as const, placeholder: '12 345 678 901', keyboardType: 'numeric' as const },
          ].map((field) => (
            <View key={field.key} style={globalStyles.inputContainer}>
              <Text style={globalStyles.label}>{field.label}</Text>
              <TextInput
                style={globalStyles.input}
                value={form[field.key]}
                onChangeText={set(field.key)}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textMuted}
                keyboardType={field.keyboardType ?? 'default'}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[globalStyles.primaryButton, saving && styles.disabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={globalStyles.primaryButtonText}>Save settings</Text>
            )}
          </TouchableOpacity>

          <View style={globalStyles.divider} />
          <Text style={styles.sectionTitle}>Company logo</Text>
          <Text style={styles.sectionSubtitle}>
            Appears in the header of generated invoice PDFs.
          </Text>

          {logoUrl ? (
            <View>
              <View style={styles.logoPreviewBox}>
                <Image source={{ uri: logoUrl }} style={styles.logoPreviewImage} resizeMode="contain" />
              </View>
              <View style={styles.logoButtonRow}>
                <TouchableOpacity
                  style={[globalStyles.secondaryButton, styles.logoBtn, logoLoading && styles.disabled]}
                  onPress={handlePickLogo}
                  disabled={logoLoading}
                >
                  {logoLoading
                    ? <ActivityIndicator size="small" color={colors.text} />
                    : <Text style={globalStyles.secondaryButtonText}>Change</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[globalStyles.dangerButton, styles.logoBtn, logoLoading && styles.disabled]}
                  onPress={handleRemoveLogo}
                  disabled={logoLoading}
                >
                  <Text style={globalStyles.dangerButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[globalStyles.secondaryButton, logoLoading && styles.disabled, { marginBottom: spacing.md }]}
              onPress={handlePickLogo}
              disabled={logoLoading}
            >
              {logoLoading
                ? <ActivityIndicator size="small" color={colors.text} />
                : <Text style={globalStyles.secondaryButtonText}>Upload logo</Text>
              }
            </TouchableOpacity>
          )}

          <View style={globalStyles.divider} />
          <Text style={styles.sectionTitle}>PayID</Text>
          <Text style={styles.sectionSubtitle}>
            Stored encrypted. Optionally included in invoice PDFs for payment instructions.
          </Text>

          {payidVisible && (
            <View style={styles.payidReveal}>
              <Text style={styles.payidLabel}>Current PayID</Text>
              <Text style={styles.payidValue}>{payidDecrypted ?? 'Not set'}</Text>
            </View>
          )}

          {!payidVisible && (
            <TouchableOpacity
              style={[globalStyles.secondaryButton, payidLoading && styles.disabled, { marginBottom: spacing.md }]}
              onPress={handleRevealPayid}
              disabled={payidLoading}
            >
              {payidLoading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={globalStyles.secondaryButtonText}>Reveal current PayID</Text>
              )}
            </TouchableOpacity>
          )}

          <View style={globalStyles.inputContainer}>
            <Text style={globalStyles.label}>New PayID</Text>
            <TextInput
              style={globalStyles.input}
              value={form.newPayid}
              onChangeText={set('newPayid')}
              placeholder="phone, email, or ABN"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[globalStyles.secondaryButton, payidSaving && styles.disabled]}
            onPress={handleSavePayid}
            disabled={payidSaving || !form.newPayid.trim()}
          >
            {payidSaving ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={globalStyles.secondaryButtonText}>Update PayID</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Currency picker */}
      <Modal visible={currencyPickerOpen} transparent animationType="slide" onRequestClose={() => setCurrencyPickerOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Select currency</Text>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.optionRow, item.code === form.currency && styles.optionRowSelected]}
                  onPress={() => { set('currency')(item.code); setCurrencyPickerOpen(false); }}
                >
                  <Text style={[styles.optionText, item.code === form.currency && styles.optionTextSelected]}>{item.label}</Text>
                  {item.code === form.currency && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: spacing['2xl'] },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: 4 },
  sectionSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 18 },
  readonlyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  readonlyLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  readonlyValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  disabled: { opacity: 0.6 },
  payidReveal: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  payidLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 4 },
  payidValue: { fontSize: fontSize.base, color: colors.text, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, maxHeight: '70%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: colors.border,
    borderRadius: radius.full, alignSelf: 'center', marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  optionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  optionRowSelected: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, borderRadius: radius.md },
  optionText: { fontSize: fontSize.base, color: colors.text },
  optionTextSelected: { color: colors.primary, fontWeight: '600' },
  logoPreviewBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logoPreviewImage: {
    width: '100%',
    height: 80,
  },
  logoButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  logoBtn: { flex: 1 },
});
