import { useState, useEffect, useCallback } from 'react';
import {
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchAuthSession,
  AuthError,
} from 'aws-amplify/auth';

export interface AuthUser {
  userId: string;
  username: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const current = await getCurrentUser();
      setUser({ userId: current.userId, username: current.username });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const result = await signIn({ username: email, password });
      if (result.isSignedIn) {
        await refresh();
      }
    },
    [refresh]
  );

  const register = useCallback(
    async (email: string, password: string, currency = 'USD'): Promise<{ needsConfirmation: boolean }> => {
      const result = await signUp({
        username: email,
        password,
        options: {
          userAttributes: { email },
          clientMetadata: { currency },
        },
      });
      return { needsConfirmation: result.nextStep.signUpStep === 'CONFIRM_SIGN_UP' };
    },
    []
  );

  const confirmEmail = useCallback(
    async (email: string, code: string): Promise<void> => {
      await confirmSignUp({ username: email, confirmationCode: code });
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    await signOut();
    setUser(null);
  }, []);

  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    await resetPassword({ username: email });
  }, []);

  const confirmForgotPassword = useCallback(
    async (email: string, code: string, newPassword: string): Promise<void> => {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword,
      });
    },
    []
  );

  const getIdToken = useCallback(async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() ?? null;
    } catch {
      return null;
    }
  }, []);

  return {
    user,
    loading,
    refresh,
    login,
    register,
    confirmEmail,
    logout,
    forgotPassword,
    confirmForgotPassword,
    getIdToken,
  };
}

export function parseAuthError(err: unknown): string {
  if (err instanceof AuthError) {
    switch (err.name) {
      case 'UserAlreadyAuthenticatedException':
        return 'You are already signed in.';
      case 'UserNotConfirmedException':
        return 'Please verify your email before signing in.';
      case 'NotAuthorizedException':
        return 'Incorrect email or password.';
      case 'UserNotFoundException':
        return 'No account found with that email.';
      case 'UsernameExistsException':
        return 'An account with this email already exists.';
      case 'CodeMismatchException':
        return 'Invalid verification code. Please try again.';
      case 'ExpiredCodeException':
        return 'Verification code has expired. Please request a new one.';
      case 'LimitExceededException':
        return 'Too many attempts. Please wait before trying again.';
      case 'InvalidPasswordException':
        return 'Password must be at least 8 characters.';
      default:
        return err.message || 'An unexpected error occurred.';
    }
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}
