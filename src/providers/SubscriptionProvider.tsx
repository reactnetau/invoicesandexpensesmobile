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
  if (offerings.current?.availablePackages.length) {
    return offerings.current;
  }
  return Object.values(offerings.all).find((offering) => offering.availablePackages.length > 0) ?? offerings.current;
}

function getPreferredPackage(offering: PurchasesOffering | null) {
  if (!offering) return null;
  const packages = offering.availablePackages;
  return packages.find((pkg) => pkg.packageType === 'MONTHLY')
    ?? packages.find((pkg) => pkg.packageType === 'ANNUAL')
    ?? packages[0]
    ?? null;
}

function describeOfferingSetup(offerings: PurchasesOfferings | null) {
  const preferredOfferingId = getRevenueCatExtra().offeringId;
  const offeringIds = offerings ? Object.keys(offerings.all) : [];
  const packageCount = offerings
    ? Object.values(offerings.all).reduce((count, offering) => count + offering.availablePackages.length, 0)
    : 0;

  if (!offerings || offeringIds.length === 0) {
    return 'No RevenueCat offerings were returned. Create an offering in RevenueCat, attach your Google Play subscription product to a package, and mark the offering as Current.';
  }

  if (preferredOfferingId && !offerings.all[preferredOfferingId]) {
    return `RevenueCat offering "${preferredOfferingId}" was not found. Available offerings: ${offeringIds.join(', ')}.`;
  }

  if (packageCount === 0) {
    return `RevenueCat returned offering${offeringIds.length === 1 ? '' : 's'} (${offeringIds.join(', ')}), but no packages. Add your Google Play subscription product to a package in the offering.`;
  }

  return 'No subscription package is configured in RevenueCat.';
}

function ensurePurchasesCanStart() {
  if (Platform.OS === 'ios' && Constants.isDevice === false) {
    throw new Error('Subscriptions cannot be purchased in this iOS Simulator build. Use TestFlight or a development build on a real iPhone with a sandbox Apple account to test purchases.');
  }
}

async function withRevenueCatTimeout<T>(promise: Promise<T>, message: string, timeoutMs = 30000) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
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
        withRevenueCatTimeout(Purchases.getOfferings(), 'RevenueCat offerings did not load. Check your App Store product metadata and RevenueCat offering setup.'),
        withRevenueCatTimeout(Purchases.getCustomerInfo(), 'RevenueCat customer info did not load. Check your network connection and RevenueCat SDK key.'),
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
    ensurePurchasesCanStart();

    let nextOfferings = offerings;
    let currentOffering = getPreferredOffering(nextOfferings);
    let nextPackage = getPreferredPackage(currentOffering);

    if (!nextPackage) {
      nextOfferings = await withRevenueCatTimeout(
        Purchases.getOfferings(),
        'RevenueCat offerings did not load. Check your App Store product metadata and RevenueCat offering setup.'
      );
      setOfferings(nextOfferings);
      currentOffering = getPreferredOffering(nextOfferings);
      nextPackage = getPreferredPackage(currentOffering);
    }

    if (!nextPackage) {
      throw new Error(describeOfferingSetup(nextOfferings));
    }

    setPurchaseLoading(true);
    setError(null);
    try {
      const result = await withRevenueCatTimeout(
        Purchases.purchasePackage(nextPackage),
        'The purchase did not finish. Close the purchase sheet if it is open, check your sandbox account, then try again.',
        120000
      );
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
      const nextCustomerInfo = await withRevenueCatTimeout(
        Purchases.restorePurchases(),
        'Restore purchases did not finish. Check your sandbox account and try again.',
        120000
      );
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
