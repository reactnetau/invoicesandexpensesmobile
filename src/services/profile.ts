import { generateClient } from 'aws-amplify/data';
import { fetchUserAttributes } from 'aws-amplify/auth';
import type { Schema } from '../types/amplify-schema';

const client = generateClient<Schema>();

export async function ensureUserProfile(email: string, currency = 'AUD') {
  const result = await client.mutations.initializeUserProfile({
    email,
    currency,
  });

  if (result.data?.error) {
    throw new Error(result.data.error);
  }

  return result.data ?? null;
}

export async function ensureCurrentUserProfile(currency = 'AUD') {
  const attributes = await fetchUserAttributes();
  const email = attributes.email?.trim();

  if (!email) {
    throw new Error('Could not find your account email. Please sign out and sign back in.');
  }

  return ensureUserProfile(email, currency);
}
