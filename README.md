# Invoices & Expenses — React Native + Amplify Gen 2

A full-stack mobile invoicing and expense tracking app for freelancers and contractors.

**Stack:** Expo (TypeScript) · AWS Amplify Gen 2 · Cognito Auth · AppSync/DynamoDB · Lambda (TypeScript) · AWS SES · Stripe · Claude AI

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 |
| Expo CLI | `npm i -g expo-cli` |
| AWS Amplify CLI | `npm i -g @aws-amplify/backend-cli` |
| AWS credentials | Configured via `aws configure` |

---

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Start the Amplify sandbox

The sandbox deploys a personal cloud backend (your own DynamoDB tables, Lambda functions, Cognito pool) into your AWS account. It hot-reloads when you change files in `amplify/`.

```bash
npx ampx sandbox
```

This generates `amplify_outputs.json` in the project root. **This file is gitignored** — every developer runs their own sandbox.

### 3. Set secrets

Secrets are stored in AWS Systems Manager Parameter Store. Set them once per sandbox:

```bash
npx ampx sandbox secret set STRIPE_SECRET_KEY
npx ampx sandbox secret set STRIPE_PRICE_ID
npx ampx sandbox secret set STRIPE_WEBHOOK_SECRET
npx ampx sandbox secret set ANTHROPIC_API_KEY
npx ampx sandbox secret set ENCRYPTION_KEY   # 64 hex chars = 32 bytes for AES-256-GCM
npx ampx sandbox secret set SES_FROM_EMAIL   # verified SES sender address
npx ampx sandbox secret set FOUNDING_MEMBERS # "true" or "false"
```

To generate a secure ENCRYPTION_KEY:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Configure Expo environment

Copy `.env.example` to `.env.local` and fill in:

```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_APP_URL=https://invoicesandexpenses.com  # or your dev URL
```

### 5. Start the app

```bash
# iOS simulator
npm run ios

# Android emulator
npm run android

# Web browser
npm run web
```

---

## AWS SES setup (required for invoice email sending)

The app uses AWS SES instead of Gmail API. Before invoice emails work:

1. **Verify your sender domain or email** in the SES console for your AWS region.
2. If your account is in the SES sandbox, also verify the recipient email addresses (or request production access).
3. Set `SES_FROM_EMAIL` to your verified sender address.

---

## Stripe setup

### Webhook

The Amplify backend deploys an API Gateway endpoint for Stripe webhooks. The URL is output by the CDK stack as `StripeWebhookUrl`.

Find it after deployment:
```bash
# Sandbox
npx ampx sandbox outputs

# Production
aws cloudformation describe-stacks --stack-name <StackName> --query "Stacks[0].Outputs"
```

1. Go to [Stripe Dashboard → Webhooks → Add Endpoint](https://dashboard.stripe.com/webhooks).
2. Paste the `StripeWebhookUrl` value.
3. Subscribe to these events:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret and set `STRIPE_WEBHOOK_SECRET`.

### Deep links after checkout

Stripe redirects back to `EXPO_PUBLIC_APP_URL/stripe-success` and `/stripe-cancel`. On mobile these open in the in-app browser — the app calls `fetchProfile()` after the browser closes to pick up the updated subscription status.

---

## Amplify Gen 2 deployment (production)

```bash
# Deploy to a named branch (e.g. main)
npx ampx pipeline-deploy --branch main --app-id <AmplifyAppId>
```

Production secrets are set in the Amplify Console under **App settings → Secrets**.

---

## Public invoice links

Public invoice URLs have the form:
```
https://invoicesandexpenses.com/invoice/<publicId>
```

On mobile these are handled by **Expo deep links** and the `PublicInvoiceScreen`. The screen uses the `publicApiKey` authorization mode so no login is required.

On web (via `expo start --web`) the same screen renders in a browser.

If you want a standalone public web surface (e.g. for clients on desktop), you can deploy the Expo web build (`npm run web` → `dist/`) to a CDN or S3 + CloudFront.

---

## TypeScript check

```bash
npm run ts-check
```

---

## Architecture notes

| Old (Next.js / Prisma) | New (React Native / Amplify Gen 2) |
|---|---|
| Postgres via Prisma | DynamoDB via Amplify Data (AppSync) |
| JWT cookie auth | Cognito User Pool |
| `bcryptjs` password hashing | Handled by Cognito |
| `PasswordReset` model + token email | Cognito built-in forgot-password flow |
| Next.js API routes | Amplify Lambda functions |
| Gmail API (OAuth 2.0) | AWS SES |
| `process.env.ENCRYPTION_KEY` in API routes | `secret('ENCRYPTION_KEY')` in Lambda only — never the client |
| `NEXT_PUBLIC_FOUNDING_MEMBERS` flag | `FOUNDING_MEMBERS` secret in Lambda — same logic, first 50 users |
| Railway deployment | Amplify Gen 2 + Expo EAS (or bare RN) |

---

## Founding member logic

- Controlled by the `FOUNDING_MEMBERS` secret (set to `"true"` to enable).
- The `createUserProfile` Lambda counts total UserProfile records on signup.
- The first 50 users get `isFoundingMember: true` and `subscriptionStatus: "active"`.
- The Stripe webhook Lambda skips founding members when processing subscription deletions or deactivations.
- Founding members see "Founding member — Pro forever" in the Account screen.

---

## Setup checklist

- [ ] `npm install`
- [ ] `npx ampx sandbox` running and `amplify_outputs.json` generated
- [ ] All 7 secrets set via `npx ampx sandbox secret set`
- [ ] SES sender email/domain verified
- [ ] Stripe products/prices created; `STRIPE_PRICE_ID` set
- [ ] Stripe webhook endpoint added with correct events
- [ ] `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` set in `.env.local`
- [ ] `EXPO_PUBLIC_APP_URL` pointing to your domain (for invoice links in PDFs/emails)
- [ ] App runs on iOS/Android simulator via `npm run ios` / `npm run android`
