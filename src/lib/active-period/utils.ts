import type { ActivePeriod } from "@/lib/active-period/types";

export const ACTIVE_PERIOD_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const ACTIVE_PERIOD_COOKIE_PREFIX = "ondix_active_period";

export const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const shortMonthNames = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export function getActivePeriodCookieName(userId: string, companyId: string) {
  return `${ACTIVE_PERIOD_COOKIE_PREFIX}_${userId}_${companyId}`;
}

export function formatActivePeriodValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function formatActivePeriodLabel(year: number, month: number) {
  return `${monthNames[month - 1]}/${year}`;
}

export function createActivePeriod(year: number, month: number): ActivePeriod {
  return {
    label: formatActivePeriodLabel(year, month),
    month,
    value: formatActivePeriodValue(year, month),
    year,
  };
}

export function getDefaultActivePeriod(date = new Date()) {
  return createActivePeriod(date.getFullYear(), date.getMonth() + 1);
}

export function normalizeActivePeriod(
  value?: string | null,
  fallbackDate = new Date(),
) {
  const fallback = getDefaultActivePeriod(fallbackDate);

  if (!value) {
    return fallback;
  }

  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());

  if (!match) {
    return fallback;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (year < 2000 || year > 2100 || month < 1 || month > 12) {
    return fallback;
  }

  return createActivePeriod(year, month);
}
