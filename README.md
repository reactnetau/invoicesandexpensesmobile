# Invoices & Expenses — React Native Mobile App

A mobile invoicing and expense tracking app for freelancers and contractors.

**Stack:** Expo (TypeScript) · AWS Amplify client · RevenueCat · React Navigation

Mobile subscriptions now use RevenueCat. The sibling backend still contains Stripe infrastructure used by the web app and legacy subscription records.

The Amplify Gen 2 backend now lives in the sibling project:

```bash
../invoicesandexpensesbackend
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20 or 22 LTS |
| Expo CLI | `npm i -g expo-cli` |
| AWS credentials | Configured via `aws configure` |

---

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Start the backend sandbox

The sandbox deploys a personal cloud backend from the sibling backend project. It writes `amplify_outputs.json` back into this mobile app so Amplify can configure itself locally.

```bash
cd ../invoicesandexpensesbackend
yarn sandbox
```

This generates `amplify_outputs.json` in the mobile project root. **This file is gitignored** — every developer runs their own sandbox.

### 3. Set backend secrets

Secrets are stored in AWS Systems Manager Parameter Store. Set them once per sandbox:

```bash
cd ../invoicesandexpensesbackend
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
EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY=goog_...
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro
EXPO_PUBLIC_APP_URL=https://invoicesandexpenses.com
```

Notes:
- Use RevenueCat public SDK keys from the same RevenueCat project as your entitlement and offering.
- For Test Store development, use the RevenueCat `test_...` key for the target platform.
- `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` must be the entitlement identifier, not the display name shown in the dashboard.

### 5. Start the app

Use a development build instead of Expo Go. Expo Go updates independently of your project SDK and can wipe local session state when it forces an upgrade.

```bash
# Build and install the development client once
yarn android

# Then start Metro for the installed dev client
yarn start

# iOS simulator
yarn ios

# Web browser
yarn web
```

If you need a cloud-built dev client instead of a local native build:

```bash
eas build --profile development --platform android
eas build --profile development --platform ios
```

Avoid using `expo start --android` or `expo start --ios` for this app unless you explicitly want Expo Go.

## Apple App Store / TestFlight release

### Apple prerequisites

- Run `eas login` and make sure this project is linked to the Expo project in `app.config.ts`.
- Join or create an Apple Developer Program team.
- Create the app in App Store Connect with bundle ID:

```text
com.schmapps.invoicesandexpenses
```

- Use `eas credentials --platform ios` and let EAS manage certificates/profiles unless you have a reason to bring your own.
- In RevenueCat, configure the Apple app, entitlement, offering, and App Store subscription product.
- Set `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY` for production builds.
- Prepare App Store metadata: privacy policy URL, support URL/email, screenshots, subscription copy, and App Privacy answers.
- If Universal Links are required for public invoices, configure `invoicesandexpenses.com` for Associated Domains and host the Apple App Site Association file.

### Build a development client for iOS

```bash
yarn build:ios:dev
```

The development profile builds for the iOS simulator.

### Build for TestFlight / App Store

The build script increments `build-numbers.json` before starting EAS, then passes the new build number into the dynamic Expo config.

```bash
yarn build:ios:appstore
```

The production iOS profile excludes the dev-client plugin from the store build.

### Submit to App Store Connect

```bash
yarn submit:ios:appstore
```

EAS will ask for your Apple account/team/app details if they are not already saved. After upload, finish TestFlight review and App Store release steps in App Store Connect.

## Google Play release

### Release prerequisites

- Run `eas login` and `eas init` if this project has not been linked to Expo/EAS yet.
- Set `EAS_PROJECT_ID` in your shell or CI so the dynamic Expo config can populate `extra.eas.projectId`.
- Use `eas credentials` to let EAS manage the Android upload keystore.
- Confirm the Android package name remains `com.schmapps.invoicesandexpenses`.
- Prepare a privacy policy URL, Play Store listing copy, screenshots, feature graphic, support email, and data safety answers in Play Console.

### Build the Play artifact

```bash
yarn build:android:play
```

This increments `androidVersionCode` in `build-numbers.json`, builds an Android App Bundle (`.aab`), and excludes the dev-client plugin from the store build.

### Submit to Play internal testing

```bash
yarn submit:android:play
```

The configured submit profile targets the Play `internal` track.

### Subscription configuration

- Development can use RevenueCat Test Store keys.
- Production requires the correct Apple and Google public SDK keys from RevenueCat.
- The backend `syncSubscriptionState` mutation keeps Amplify-gated features such as invoice limits and CSV export aligned with RevenueCat customer state.

---

## AWS SES setup (required for invoice email sending)

The app uses AWS SES instead of Gmail API. Before invoice emails work:

1. **Verify your sender domain or email** in the SES console for your AWS region.
2. If your account is in the SES sandbox, also verify the recipient email addresses (or request production access).
3. Set `SES_FROM_EMAIL` to your verified sender address.

---

## Shared backend Stripe setup

Stripe is still configured in the sibling backend for the web app and legacy subscription/webhook handling. The mobile app itself does not use Stripe SDK checkout anymore.

### Webhook

The Amplify backend deploys an API Gateway endpoint for Stripe webhooks. The URL is output by the CDK stack as `StripeWebhookUrl`.

Find it after deployment:
```bash
# Sandbox
cd ../invoicesandexpensesbackend
yarn sandbox

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

### Mobile subscription state

Mobile purchase, restore, and management flows are handled through RevenueCat in-app. After purchase or restore, the app syncs entitlement status back to Amplify via the `syncSubscriptionState` mutation so invoice limits and CSV export remain accurate.

---

## Amplify Gen 2 deployment (production)

```bash
# Deploy to a named branch (e.g. main)
cd ../invoicesandexpensesbackend
yarn deploy --branch main --app-id <AmplifyAppId>
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
- The subscription sync flow preserves founding members as active even when no RevenueCat entitlement is present.
- Founding members see "Founding member — Pro forever" in the Account screen.

---

## Setup checklist

- [ ] `npm install`
- [ ] `yarn sandbox` running in `../invoicesandexpensesbackend` and `amplify_outputs.json` generated
- [ ] All 7 secrets set via `npx ampx sandbox secret set`
- [ ] SES sender email/domain verified
- [ ] RevenueCat entitlement and offering created in the same project
- [ ] RevenueCat Apple and Google public SDK keys set in `.env.local`
- [ ] `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` set to the exact entitlement identifier
- [ ] `EXPO_PUBLIC_APP_URL` pointing to your domain (for invoice links in PDFs/emails)
- [ ] App runs on iOS/Android simulator via `npm run ios` / `npm run android`
