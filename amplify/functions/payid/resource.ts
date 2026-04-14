import { defineFunction, secret } from '@aws-amplify/backend';

export const payidFn = defineFunction({
  name: 'payid',
  entry: './handler.ts',
  environment: {
    ENCRYPTION_KEY: secret('ENCRYPTION_KEY'),
  },
  timeoutSeconds: 10,
});
