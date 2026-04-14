/** Australian financial year: 1 July to 30 June */

export interface FinancialYear {
  startYear: number;
  label: string;
  startDate: Date;
  endDate: Date;
}

export function getCurrentFyStartYear(): number {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

export function getFyLabel(startYear: number): string {
  return `FY ${startYear}/${String(startYear + 1).slice(-2)}`;
}

export function getFyDateRange(startYear: number): { startDate: Date; endDate: Date } {
  return {
    startDate: new Date(startYear, 6, 1),
    endDate: new Date(startYear + 1, 6, 1),
  };
}

/**
 * Returns an array of financial years from 3 years ago to the current FY,
 * ordered from most recent to oldest.
 */
export function getAvailableFinancialYears(count = 4): FinancialYear[] {
  const current = getCurrentFyStartYear();
  const years: FinancialYear[] = [];
  for (let i = 0; i < count; i++) {
    const startYear = current - i;
    const { startDate, endDate } = getFyDateRange(startYear);
    years.push({ startYear, label: getFyLabel(startYear), startDate, endDate });
  }
  return years;
}

/**
 * Returns true if a date falls within the given financial year.
 */
export function isInFy(date: string | Date, startYear: number): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const { startDate, endDate } = getFyDateRange(startYear);
  return d >= startDate && d < endDate;
}
