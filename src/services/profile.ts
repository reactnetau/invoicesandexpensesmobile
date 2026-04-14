import { generateClient } from 'aws-amplify/data';
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
