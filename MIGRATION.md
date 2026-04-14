# Migration: Next.js / Prisma / Postgres → React Native / Amplify Gen 2

This document describes how the existing data model maps to the new Amplify Data (DynamoDB) model, and what you need to do if you want to migrate existing user data.

> **Important:** No destructive migration steps are attempted automatically. Manual data export and import is required to move production data.

---

## Data model mapping

### User → UserProfile

| Prisma (Postgres) | Amplify Data (DynamoDB) | Notes |
|---|---|---|
| `id` (UUID) | `id` (UUID, generated) | New IDs generated in DynamoDB |
| `email` | `email` | Same |
| `password_hash` | — | Replaced by Cognito — not migrated |
| `stripe_customer_id` | `stripeCustomerId` | camelCase |
| `subscription_status` | `subscriptionStatus` | camelCase |
| `subscription_end_date` | `subscriptionEndDate` | ISO string in DynamoDB |
| `is_founding_member` | `isFoundingMember` | camelCase |
| `payid_encrypted` | `payidEncrypted` | Same AES-256-GCM format (`iv:tag:ciphertext`) — compatible if same ENCRYPTION_KEY is used |
| `currency` | `currency` | Same |
| `business_name` | `businessName` | camelCase |
| `full_name` | `fullName` | camelCase |
| `phone` | `phone` | Same |
| `address` | `address` | Same |
| `abn` | `abn` | Same |
| `created_at` | `createdAt` | ISO string |

### Client

| Prisma | Amplify Data | Notes |
|---|---|---|
| `id` | `id` | New IDs in DynamoDB |
| `user_id` | `owner` (Amplify auth field) | Amplify uses Cognito sub as owner |
| `name` | `name` | Same |
| `email` | `email` | Same |
| `phone` | `phone` | Same |
| `company` | `company` | Same |
| `address` | `address` | Same |
| `created_at` | `createdAt` | Same |

### Invoice

| Prisma | Amplify Data | Notes |
|---|---|---|
| `id` | `id` | New IDs |
| `user_id` | `owner` | Cognito sub |
| `client_id` | `clientId` | Now references new DynamoDB client ID |
| `client_name` | `clientName` | camelCase |
| `client_email` | `clientEmail` | camelCase |
| `amount` (Decimal) | `amount` (Float) | Convert; DynamoDB stores as number |
| `status` | `status` | Same (`unpaid` / `paid`) |
| `due_date` | `dueDate` | ISO string |
| `paid_at` | `paidAt` | ISO string |
| `public_id` | `publicId` | Same UUID — existing public links continue to work if mapped correctly |
| `is_public` | `isPublic` | camelCase |
| `created_at` | `createdAt` | ISO string |

> **Key:** The `public_id` value must be preserved exactly so that existing public invoice links (`/invoice/<publicId>`) continue to work after migration.

### Expense

| Prisma | Amplify Data | Notes |
|---|---|---|
| `id` | `id` | New IDs |
| `user_id` | `owner` | Cognito sub |
| `category` | `category` | Same |
| `amount` (Decimal) | `amount` (Float) | Convert |
| `date` | `date` | ISO string |
| `created_at` | `createdAt` | ISO string |

### PasswordReset

Not migrated. Cognito handles password reset natively via its built-in forgot-password flow. No PasswordReset records need to be moved.

---

## Migration approach

### Step 1 — Export data from Postgres

```sql
-- Export all tables to CSV
COPY users TO '/tmp/users.csv' DELIMITER ',' CSV HEADER;
COPY clients TO '/tmp/clients.csv' DELIMITER ',' CSV HEADER;
COPY invoices TO '/tmp/invoices.csv' DELIMITER ',' CSV HEADER;
COPY expenses TO '/tmp/expenses.csv' DELIMITER ',' CSV HEADER;
```

Or use `pg_dump` / `\copy` depending on your setup.

### Step 2 — Invite users to create new Cognito accounts

Because passwords are stored as bcrypt hashes in Postgres, they **cannot** be migrated to Cognito. Users must:

1. Visit the app and tap **Create account** with their existing email.
2. Verify their email via the Cognito code.
3. Their `UserProfile` is created automatically on first login.

**Alternative:** Use the Cognito [User Migration Lambda trigger](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html) to verify the existing bcrypt hash on first login and silently migrate users without requiring password resets. This is more complex but seamless for users.

### Step 3 — Import profile and business data

After a user creates their Cognito account, you can pre-populate their `UserProfile` in DynamoDB using a one-time import script. Map the Postgres `user.id` → new Cognito `sub` using the user's email address as the join key.

```typescript
// Example: batch import using AWS SDK
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

for (const row of postgresUsers) {
  // Look up Cognito sub by email
  const cognitoUser = await cognito.adminGetUser({ UserPoolId, Username: row.email });
  const sub = cognitoUser.UserAttributes.find(a => a.Name === 'sub')?.Value;

  await ddb.send(new PutCommand({
    TableName: USER_PROFILE_TABLE,
    Item: {
      id: uuid(),
      owner: sub,
      email: row.email,
      stripeCustomerId: row.stripe_customer_id,
      subscriptionStatus: row.subscription_status,
      subscriptionEndDate: row.subscription_end_date?.toISOString() ?? null,
      isFoundingMember: row.is_founding_member,
      payidEncrypted: row.payid_encrypted,  // compatible format — same ENCRYPTION_KEY required
      currency: row.currency,
      businessName: row.business_name,
      fullName: row.full_name,
      phone: row.phone,
      address: row.address,
      abn: row.abn,
      createdAt: row.created_at.toISOString(),
      updatedAt: new Date().toISOString(),
      __typename: 'UserProfile',
    },
  }));
}
```

### Step 4 — Import invoices, expenses, and clients

Use a similar script, joining on the user's email → Cognito sub → DynamoDB UserProfile owner.

Critical for invoices: **preserve the `publicId` field exactly** so existing public links continue to resolve.

### Step 5 — Verify Stripe customer IDs

If `stripeCustomerId` is migrated correctly, the Stripe webhook will continue to work for existing subscribers. Test by triggering a test webhook event.

### Step 6 — Update PayID encryption key

If you use the **same** `ENCRYPTION_KEY` value in the new Lambda environment, existing encrypted PayID values (`iv:tag:ciphertext`) will decrypt correctly without any change.

If you rotate the key, you must decrypt all values with the old key and re-encrypt with the new key before importing.

---

## Broken links / compatibility

| Scenario | Outcome |
|---|---|
| Old web app public invoice links (`/invoice/<publicId>`) | Work if Expo web is deployed to the same domain, or if a redirect is set up |
| Old web app login links | Redirect to the new app's login screen |
| Stripe subscription webhooks | Continue to work if `stripeCustomerId` is migrated |
| Existing bcrypt passwords | Not migrated — users must set a new password via Cognito |
