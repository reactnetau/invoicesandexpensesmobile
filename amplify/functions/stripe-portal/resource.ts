import { defineFunction, secret } from '@aws-amplify/backend';

export const stripePortalFn = defineFunction({
  name: 'stripePortal',
  entry: './handler.ts',
  environment: {
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
    // APP_URL injected from backend.ts
  },
  timeoutSeconds: 15,
});
