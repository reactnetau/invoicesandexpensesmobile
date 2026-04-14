import Constants from 'expo-constants';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Linking, Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  CustomerInfoUpdateListener,
  LOG_LEVEL,
  PurchasesEntitlementInfo,
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../types/amplify-schema';

const client = generateClient<Schema>();

type RevenueCatExtra = {
  appleApiKey?: string;
  googleApiKey?: string;
  entitlementId?: string;
  offeringId?: string;
};

type SubscriptionContextValue = {
  loading: boolean;
  purchaseLoading: boolean;
  restoreLoading: boolean;
  configured: boolean;
  error: string | null;
  offerings: PurchasesOfferings | null;
  currentOffering: PurchasesOffering | null;
  currentPackage: PurchasesPackage | null;
  customerInfo: CustomerInfo | null;
  activeEntitlement: PurchasesEntitlementInfo | null;
  isSubscriptionActive: boolean;
  managementUrl: string | null;
  refresh: () => Promise<void>;
  purchaseCurrentPackage: () => Promise<CustomerInfo | null>;
  restorePurchases: () => Promise<CustomerInfo | null>;
  openManagementUrl: () => Promise<boolean>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

let configuredApiKey: string | null = null;
let configuredAppUserId: string | null = null;

function getRevenueCatExtra(): RevenueCatExtra {
  const extra = (Constants.expoConfig?.extra as { revenueCat?: RevenueCatExtra } | undefined)?.revenueCat;
  return extra ?? {};
}

function getRevenueCatApiKey() {
  const extra = getRevenueCatExtra();
  return (Platform.OS === 'ios' ? extra.appleApiKey ?? '' : extra.googleApiKey ?? '').trim();
}

function getEntitlementId() {
  return (getRevenueCatExtra().entitlementId ?? 'pro').trim();
}

function validateRevenueCatConfig(apiKey: string, entitlementId: string) {
  if (!apiKey) {
    return 'RevenueCat API key is missing for this platform.';
  }

  const validPrefixes = Platform.OS === 'ios'
    ? ['appl_', 'test_']
    : ['goog_', 'amzn_', 'test_'];

  if (!validPrefixes.some((prefix) => apiKey.startsWith(prefix))) {
    return `RevenueCat API key for ${Platform.OS} looks invalid. Expected one of: ${validPrefixes.join(', ')}.`;
  }

  if (!entitlementId) {
    return 'RevenueCat entitlement identifier is missing.';
  }

  if (/\s/.test(entitlementId)) {
    return 'RevenueCat entitlement identifier looks wrong. Use the entitlement identifier, not the display name.';
  }

  return null;
}

function getPreferredOffering(offerings: PurchasesOfferings | null) {
  if (!offerings) return null;
  const preferredOfferingId = getRevenueCatExtra().offeringId;
  if (preferredOfferingId && offerings.all[preferredOfferingId]) {
    return offerings.all[preferredOfferingId];
  }
  return offerings.current;
}

function getPreferredPackage(offering: PurchasesOffering | null) {
  if (!offering) return null;
  return offering.availablePackages[0] ?? null;
}

async function syncSubscriptionState(appUserId: string, customerInfo: CustomerInfo, entitlementId: string) {
  const entitlement = customerInfo.entitlements.active[entitlementId] ?? null;
  await client.mutations.syncSubscriptionState({
    appUserId,
    entitlementIdentifier: entitlementId,
    entitlementActive: !!entitlement?.isActive,
    productIdentifier: entitlement?.productIdentifier,
    expirationDate: entitlement?.expirationDate ?? undefined,
  } as never);
}

async function ensureConfigured(appUserId: string) {
  const apiKey = getRevenueCatApiKey();
  const entitlementId = getEntitlementId();
  const configError = validateRevenueCatConfig(apiKey, entitlementId);
  if (configError) {
    throw new Error(configError);
  }

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);

  if (!configuredApiKey || configuredApiKey !== apiKey) {
    Purchases.configure({ apiKey, appUserID: appUserId });
    configuredApiKey = apiKey;
    configuredAppUserId = appUserId;
    return;
  }

  if (configuredAppUserId !== appUserId) {
    await Purchases.logIn(appUserId);
    configuredAppUserId = appUserId;
  }
}

export function SubscriptionProvider({ appUserId, children }: { appUserId: string; children: ReactNode }) {
  const entitlementId = getEntitlementId();
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureConfigured(appUserId);
      const [nextOfferings, nextCustomerInfo] = await Promise.all([
        Purchases.getOfferings(),
        Purchases.getCustomerInfo(),
      ]);
      setOfferings(nextOfferings);
      setCustomerInfo(nextCustomerInfo);
      setConfigured(true);
      await syncSubscriptionState(appUserId, nextCustomerInfo, entitlementId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription state');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();

    const listener: CustomerInfoUpdateListener = (nextCustomerInfo) => {
      setCustomerInfo(nextCustomerInfo);
      void syncSubscriptionState(appUserId, nextCustomerInfo, entitlementId);
    };

    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [appUserId, entitlementId]);

  const purchaseCurrentPackage = async () => {
    const currentOffering = getPreferredOffering(offerings);
    const nextPackage = getPreferredPackage(currentOffering);
    if (!nextPackage) {
      throw new Error('No subscription package is configured in RevenueCat.');
    }

    setPurchaseLoading(true);
    setError(null);
    try {
      const result = await Purchases.purchasePackage(nextPackage);
      setCustomerInfo(result.customerInfo);
      await syncSubscriptionState(appUserId, result.customerInfo, entitlementId);
      return result.customerInfo;
    } finally {
      setPurchaseLoading(false);
    }
  };

  const restorePurchases = async () => {
    setRestoreLoading(true);
    setError(null);
    try {
      const nextCustomerInfo = await Purchases.restorePurchases();
      setCustomerInfo(nextCustomerInfo);
      await syncSubscriptionState(appUserId, nextCustomerInfo, entitlementId);
      return nextCustomerInfo;
    } finally {
      setRestoreLoading(false);
    }
  };

  const openManagementUrl = async () => {
    const url = customerInfo?.managementURL;
    if (!url) return false;
    await Linking.openURL(url);
    return true;
  };

  const currentOffering = useMemo(() => getPreferredOffering(offerings), [offerings]);
  const currentPackage = useMemo(() => getPreferredPackage(currentOffering), [currentOffering]);
  const activeEntitlement = customerInfo?.entitlements.active[entitlementId] ?? null;

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      loading,
      purchaseLoading,
      restoreLoading,
      configured,
      error,
      offerings,
      currentOffering,
      currentPackage,
      customerInfo,
      activeEntitlement,
      isSubscriptionActive: !!activeEntitlement?.isActive,
      managementUrl: customerInfo?.managementURL ?? null,
      refresh,
      purchaseCurrentPackage,
      restorePurchases,
      openManagementUrl,
    }),
    [
      activeEntitlement,
      configured,
      currentOffering,
      currentPackage,
      customerInfo,
      error,
      loading,
      offerings,
      purchaseLoading,
      restoreLoading,
    ]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const value = useContext(SubscriptionContext);
  if (!value) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return value;
}