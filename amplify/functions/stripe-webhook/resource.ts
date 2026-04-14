import { defineFunction, secret } from '@aws-amplify/backend';

export const stripeWebhookFn = defineFunction({
  name: 'stripeWebhook',
  entry: './handler.ts',
  environment: {
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
    STRIPE_WEBHOOK_SECRET: secret('STRIPE_WEBHOOK_SECRET'),
  },
  // Webhook handler needs table access — injected in backend.ts via CDK
  timeoutSeconds: 15,
});
