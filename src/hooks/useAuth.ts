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
import { ensureCurrentUserProfile, ensureUserProfile } from '../services/profile';

export interface AuthUser {
  userId: string;
  username: string;
}

export function describeAuthError(err: unknown): Record<string, unknown> {
  if (typeof err !== 'object' || err === null) {
    return { value: err };
  }

  const error = err as Record<string, unknown>;
  return {
    name: error.name,
    message: error.message,
    recoverySuggestion: error.recoverySuggestion,
    underlyingError: error.underlyingError,
    cause: error.cause,
  };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const current = await getCurrentUser();
      setUser({ userId: current.userId, username: current.username });

      try {
        await ensureCurrentUserProfile('AUD');
      } catch (err) {
        console.warn('[useAuth] profile bootstrap failed', err);
      }
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
      const result = await signIn({
        username: email,
        password,
        options: {
          authFlowType: 'USER_PASSWORD_AUTH',
        },
      });
      if (result.isSignedIn) {
        try {
          await ensureUserProfile(email, 'AUD');
        } catch (err) {
          console.warn('[useAuth] profile initialization failed', err);
        }
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
  const name = typeof err === 'object' && err !== null && 'name' in err ? String(err.name) : '';
  const message =
    typeof err === 'object' && err !== null && 'message' in err
      ? String(err.message)
      : '';
  const recoverySuggestion =
    typeof err === 'object' && err !== null && 'recoverySuggestion' in err
      ? String(err.recoverySuggestion)
      : '';

  if (err instanceof AuthError || name) {
    switch (name) {
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
        return recoverySuggestion || message || 'An unexpected error occurred.';
    }
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}
