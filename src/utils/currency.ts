/**
 * Format a monetary amount using the user's selected currency code.
 * Uses Intl.NumberFormat so it respects the locale's decimal/separator rules.
 */
export function formatCurrency(amount: number, currencyCode = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if the currency code is invalid
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

/**
 * Format a date string or Date into a human-readable string.
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date as ISO date string (YYYY-MM-DD) for display in inputs.
 */
export function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0];
}
