/**
 * Feature flags — read from Expo public env vars at build time.
 *
 * EXPO_PUBLIC_ENABLE_PUBLIC_INVOICE_URLS=true  enables public invoice link
 * functionality (deep-link route, copy/open link UI in InvoiceDetail, and
 * the unauthenticated PublicInvoice screen).
 *
 * Anything other than the exact string "true" (including a missing var)
 * disables the feature.
 */
export const ENABLE_PUBLIC_INVOICE_URLS =
  process.env.EXPO_PUBLIC_ENABLE_PUBLIC_INVOICE_URLS === 'true';
