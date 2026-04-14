import { defineFunction, secret } from '@aws-amplify/backend';

export const aiSummaryFn = defineFunction({
  name: 'aiSummary',
  entry: './handler.ts',
  environment: {
    ANTHROPIC_API_KEY: secret('ANTHROPIC_API_KEY'),
  },
  timeoutSeconds: 30,
});
