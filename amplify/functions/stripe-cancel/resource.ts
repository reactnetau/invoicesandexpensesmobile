import { defineFunction, secret } from '@aws-amplify/backend';

export const stripeCancelFn = defineFunction({
  name: 'stripeCancel',
  entry: './handler.ts',
  environment: {
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
  },
  timeoutSeconds: 15,
});
