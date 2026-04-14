import { defineFunction, secret } from '@aws-amplify/backend';

export const invoiceEmailFn = defineFunction({
  name: 'invoiceEmail',
  entry: './handler.ts',
  environment: {
    ENCRYPTION_KEY: secret('ENCRYPTION_KEY'),
    SES_FROM_EMAIL: secret('SES_FROM_EMAIL'),
    // APP_URL injected from backend.ts
  },
  timeoutSeconds: 30,
});
