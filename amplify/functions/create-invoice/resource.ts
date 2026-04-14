import { defineFunction, secret } from '@aws-amplify/backend';

export const createInvoiceFn = defineFunction({
  name: 'createInvoice',
  entry: './handler.ts',
  environment: {
    ENCRYPTION_KEY: secret('ENCRYPTION_KEY'),
    SES_FROM_EMAIL: secret('SES_FROM_EMAIL'),
    // APP_URL injected from backend.ts
  },
  timeoutSeconds: 30,
});
