const buildProfile = process.env.EAS_BUILD_PROFILE ?? process.env.APP_VARIANT ?? 'development';
const isProductionBuild = buildProfile === 'production';
const buildNumbers = require('./build-numbers.json');
const iosBuildNumber = process.env.IOS_BUILD_NUMBER ?? String(buildNumbers.iosBuildNumber ?? 1);
const androidVersionCode = Number.parseInt(
  process.env.ANDROID_VERSION_CODE ?? String(buildNumbers.androidVersionCode ?? 1),
  10
);
const easProjectId =
  process.env.EAS_PROJECT_ID ??
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
  '657a8bdb-1d84-4305-af8f-40d813ddb64a';
const revenueCat = {
  appleApiKey: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY ?? '',
  googleApiKey: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY ?? '',
  entitlementId: process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? 'pro',
  offeringId: process.env.EXPO_PUBLIC_REVENUECAT_OFFERING_ID ?? '',
};

const plugins = [
  [
    'expo-build-properties',
    {
      android: {
        compileSdkVersion: 35,
        targetSdkVersion: 35,
      },
    },
  ],
  !isProductionBuild
    ? [
        'expo-dev-client',
        {
          launchMode: 'most-recent',
        },
      ]
    : null,
].filter(Boolean);

export default {
  expo: {
    name: 'Invoices & Expenses',
    slug: 'schmapps-invoice-and-expenses',
    version: '1.0.0',
    icon: './src/assets/schmappslogo.png',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    splash: {
      image: './src/assets/schmappslogo.png',
      resizeMode: 'contain',
      backgroundColor: '#EFF6FF',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.schmapps.invoicesandexpenses',
      buildNumber: iosBuildNumber,
      config: {
        usesNonExemptEncryption: false,
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      associatedDomains: ['applinks:invoicesandexpenses.com'],
    },
    android: {
      package: 'com.schmapps.invoicesandexpenses',
      versionCode: Number.isFinite(androidVersionCode) ? androidVersionCode : 1,
      adaptiveIcon: {
        foregroundImage: './src/assets/schmappslogo.png',
        backgroundColor: '#EFF6FF',
      },
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: 'invoicesandexpenses.com',
              pathPrefix: '/invoice',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      bundler: 'metro',
      favicon: './src/assets/schmappslogo.png',
    },
    scheme: 'invoicesandexpenses',
    plugins,
    extra: {
      revenueCat,
      ...(easProjectId
        ? {
            eas: {
              projectId: easProjectId,
            },
          }
        : {}),
    },
  },
};
