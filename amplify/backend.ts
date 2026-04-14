import { defineBackend } from '@aws-amplify/backend';
import { CfnOutput } from 'aws-cdk-lib';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

import { auth } from './auth/resource';
import { data } from './data/resource';
import { createUserProfileFn } from './functions/create-user-profile/resource';
import { createInvoiceFn } from './functions/create-invoice/resource';
import { stripeCheckoutFn } from './functions/stripe-checkout/resource';
import { stripePortalFn } from './functions/stripe-portal/resource';
import { stripeCancelFn } from './functions/stripe-cancel/resource';
import { stripeWebhookFn } from './functions/stripe-webhook/resource';
import { invoiceEmailFn } from './functions/invoice-email/resource';
import { csvExportFn } from './functions/csv-export/resource';
import { aiSummaryFn } from './functions/ai-summary/resource';
import { publicInvoiceFn } from './functions/public-invoice/resource';
import { payidFn } from './functions/payid/resource';

const backend = defineBackend({
  auth,
  data,
  createUserProfileFn,
  createInvoiceFn,
  stripeCheckoutFn,
  stripePortalFn,
  stripeCancelFn,
  stripeWebhookFn,
  invoiceEmailFn,
  csvExportFn,
  aiSummaryFn,
  publicInvoiceFn,
  payidFn,
});

// ── Stripe Webhook HTTP endpoint ─────────────────────────────────────────────
// Stripe needs a plain HTTP POST endpoint — we expose the Lambda via API Gateway.
const webhookStack = backend.createStack('StripeWebhookStack');

const webhookApi = new HttpApi(webhookStack, 'StripeWebhookApi', {
  apiName: 'invoices-stripe-webhook',
  description: 'Stripe webhook receiver for Invoices & Expenses',
  corsPreflight: {
    allowOrigins: ['https://api.stripe.com'],
    allowMethods: [HttpMethod.POST],
  },
});

const webhookIntegration = new HttpLambdaIntegration(
  'StripeWebhookIntegration',
  backend.stripeWebhookFn.resources.lambda
);

webhookApi.addRoutes({
  path: '/webhook/stripe',
  methods: [HttpMethod.POST],
  integration: webhookIntegration,
});

// Expose the webhook URL as a stack output so it can be added to Stripe dashboard
new CfnOutput(webhookStack, 'StripeWebhookUrl', {
  value: `${webhookApi.apiEndpoint}/webhook/stripe`,
  description:
    'Add this URL to your Stripe Dashboard > Webhooks > Add Endpoint. ' +
    'Events to subscribe: checkout.session.completed, invoice.paid, customer.subscription.deleted',
});

// ── Environment variable: APP_URL for PDF/email links ────────────────────────
const appUrl = process.env.APP_URL ?? 'https://invoicesandexpenses.com';

const allLambdas = [
  backend.createUserProfileFn.resources.lambda,
  backend.createInvoiceFn.resources.lambda,
  backend.stripeCheckoutFn.resources.lambda,
  backend.stripePortalFn.resources.lambda,
  backend.stripeCancelFn.resources.lambda,
  backend.stripeWebhookFn.resources.lambda,
  backend.invoiceEmailFn.resources.lambda,
  backend.csvExportFn.resources.lambda,
  backend.aiSummaryFn.resources.lambda,
  backend.publicInvoiceFn.resources.lambda,
  backend.payidFn.resources.lambda,
];

for (const lambda of allLambdas) {
  lambda.addEnvironment('APP_URL', appUrl);
}

export { backend };
