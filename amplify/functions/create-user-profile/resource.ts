import { defineFunction, secret } from '@aws-amplify/backend';

export const createUserProfileFn = defineFunction({
  name: 'createUserProfile',
  entry: './handler.ts',
  environment: {
    // Feature flag: set to "true" to grant founding member status to first 50 users
    FOUNDING_MEMBERS: secret('FOUNDING_MEMBERS'),
  },
  timeoutSeconds: 15,
});
