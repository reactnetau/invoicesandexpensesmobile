import type { NavigatorScreenParams } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// ── Auth stack ──────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Landing: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ConfirmReset: { email: string };
  ConfirmSignup: { email: string };
};

// ── App tab navigator (inside authenticated area) ───────────────────────────
export type AppTabParamList = {
  Dashboard: undefined;
  Invoices: undefined;
  Expenses: undefined;
  Clients: undefined;
};

// ── App stack (wraps tabs + modal/push screens) ─────────────────────────────
export type AppStackParamList = {
  Tabs: NavigatorScreenParams<AppTabParamList>;
  CreateInvoice: undefined;
  InvoiceDetail: { invoiceId: string };
  AddExpense: undefined;
  AddEditClient: { clientId?: string };
  Settings: undefined;
  Account: undefined;
};

// ── Root navigator ──────────────────────────────────────────────────────────
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppStackParamList>;
  PublicInvoice: { publicId?: string } | undefined;
};

// Screen prop helpers
export type AuthScreenProps<T extends keyof AuthStackParamList> = StackScreenProps<
  AuthStackParamList,
  T
>;

export type AppScreenProps<T extends keyof AppStackParamList> = StackScreenProps<
  AppStackParamList,
  T
>;

export type TabScreenProps<T extends keyof AppTabParamList> = BottomTabScreenProps<
  AppTabParamList,
  T
>;
