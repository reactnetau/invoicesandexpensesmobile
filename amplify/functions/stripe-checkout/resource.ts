import { defineFunction, secret } from '@aws-amplify/backend';

export const stripeCheckoutFn = defineFunction({
  name: 'stripeCheckout',
  entry: './handler.ts',
  environment: {
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
    STRIPE_PRICE_ID: secret('STRIPE_PRICE_ID'),
    // APP_URL injected from backend.ts
  },
  timeoutSeconds: 15,
});
