import React, { useState, useEffect } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Linking from 'expo-linking';
import { getCurrentUser } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

import { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { PublicInvoiceScreen } from '../screens/PublicInvoiceScreen';
import { SubscriptionProvider } from '../providers/SubscriptionProvider';
import { colors } from '../theme';
import { ActivityIndicator, View } from 'react-native';

const Root = createStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    Linking.createURL('/'),
    'https://invoicesandexpenses.com',
    'invoicesandexpenses://',
  ],
  config: {
    screens: {
      PublicInvoice: 'invoice/:publicId',
      Auth: {
        screens: {
          Login: 'login',
          Signup: 'signup',
        },
      },
      App: {
        screens: {
          Tabs: {
            screens: {
              Dashboard: 'dashboard',
              Invoices: 'invoices',
              Expenses: 'expenses',
              Clients: 'clients',
            },
          },
        },
      },
    },
  },
};

export function RootNavigator() {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>(
    'loading'
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const refreshAuthState = async () => {
      try {
        const currentUser = await getCurrentUser();
        setCurrentUserId(currentUser.userId);
        setAuthState('authenticated');
      } catch {
        setCurrentUserId(null);
        setAuthState('unauthenticated');
      }
    };

    void refreshAuthState();

    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          void refreshAuthState();
          break;
        case 'signedOut':
          setCurrentUserId(null);
          setAuthState('unauthenticated');
          break;
      }
    });

    return unsubscribe;
  }, []);

  if (authState === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        {authState === 'authenticated' ? (
          <Root.Screen name="App">
            {() => (
              <SubscriptionProvider appUserId={currentUserId!}>
                <AppNavigator />
              </SubscriptionProvider>
            )}
          </Root.Screen>
        ) : (
          <Root.Screen name="Auth" component={AuthNavigator} />
        )}

        {/* Public invoice — accessible without auth via deep link */}
        <Root.Screen name="PublicInvoice" component={PublicInvoiceScreen} />
      </Root.Navigator>
    </NavigationContainer>
  );
}
