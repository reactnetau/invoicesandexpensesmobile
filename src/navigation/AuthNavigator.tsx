import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthStackParamList } from './types';
import { LandingScreen } from '../screens/LandingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ConfirmResetScreen } from '../screens/ConfirmResetScreen';
import { ConfirmSignupScreen } from '../screens/ConfirmSignupScreen';
import { colors } from '../theme';

const Auth = createStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Auth.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0 },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        headerBackTitleVisible: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Auth.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
      <Auth.Screen name="Login" component={LoginScreen} options={{ title: '' }} />
      <Auth.Screen name="Signup" component={SignupScreen} options={{ title: '' }} />
      <Auth.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset password' }} />
      <Auth.Screen name="ConfirmReset" component={ConfirmResetScreen} options={{ title: 'New password' }} />
      <Auth.Screen name="ConfirmSignup" component={ConfirmSignupScreen} options={{ title: 'Verify email' }} />
    </Auth.Navigator>
  );
}
