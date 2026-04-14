// Domain types used across the React Native app.
// These mirror the Amplify Data schema fields.

export interface UserProfile {
  id: string;
  email: string;
  stripeCustomerId?: string | null;
  revenueCatAppUserId?: string | null;
  subscriptionProvider?: string | null;
  subscriptionProductId?: string | null;
  subscriptionStatus: string;
  subscriptionEndDate?: string | null;
  isFoundingMember: boolean;
  currency: string;
  businessName?: string | null;
  fullName?: string | null;
  phone?: string | null;
  address?: string | null;
  abn?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  address?: string | null;
  createdAt?: string;
}

export interface Invoice {
  id: string;
  clientId?: string | null;
  clientName: string;
  clientEmail?: string | null;
  amount: number;
  status: 'unpaid' | 'paid';
  dueDate: string;
  paidAt?: string | null;
  publicId: string;
  isPublic: boolean;
  createdAt?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  createdAt?: string;
}

export type ExpenseCategory =
  | 'Software'
  | 'Hardware'
  | 'Marketing'
  | 'Travel'
  | 'Office'
  | 'Contractor'
  | 'Other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Software',
  'Hardware',
  'Marketing',
  'Travel',
  'Office',
  'Contractor',
  'Other',
];

export const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'NZD', label: 'NZD — New Zealand Dollar' },
  { code: 'SGD', label: 'SGD — Singapore Dollar' },
  { code: 'JPY', label: 'JPY — Japanese Yen' },
  { code: 'CHF', label: 'CHF — Swiss Franc' },
  { code: 'HKD', label: 'HKD — Hong Kong Dollar' },
];

export const FREE_INVOICE_LIMIT = 5;

export function isPro(profile: Pick<UserProfile, 'subscriptionStatus' | 'isFoundingMember'>): boolean {
  return profile.subscriptionStatus === 'active' || profile.isFoundingMember;
}
