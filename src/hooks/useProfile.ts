import { useState, useCallback } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../types/amplify-schema';
import type { UserProfile } from '../types';
import { ensureUserProfile } from '../services/profile';

const client = generateClient<Schema>();

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await client.models.UserProfile.list();
      const item = result.data?.[0];
      if (item) {
        setProfile(item as unknown as UserProfile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  const createProfile = useCallback(
    async (email: string, currency = 'USD'): Promise<UserProfile | null> => {
      try {
        await ensureUserProfile(email, currency);
        // Fetch the full profile after creation
        await fetchProfile();
        return profile;
      } catch (err) {
        throw err;
      }
    },
    [fetchProfile, profile]
  );

  const updateProfile = useCallback(
    async (id: string, updates: Partial<UserProfile>) => {
      try {
        const result = await client.models.UserProfile.update({ id, ...updates } as any);
        if (result.data) {
          setProfile(result.data as unknown as UserProfile);
        }
      } catch (err) {
        throw err;
      }
    },
    []
  );

  const deleteAccount = useCallback(async (id: string) => {
    await client.models.UserProfile.delete({ id });
    setProfile(null);
  }, []);

  return { profile, loading, error, fetchProfile, createProfile, updateProfile, deleteAccount };
}
