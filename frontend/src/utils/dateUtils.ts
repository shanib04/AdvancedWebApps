export type DateInput = string | number | Date | null | undefined;

const DEFAULT_FALLBACK = "";

// safely parse various input types into a Date - returns null for invalid/empty values
const toDate = (value: DateInput): Date | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

type FormatDateLocalOptions = {
  fallback?: string;
};

// format a date/timestamp into a locale-aware datetime string
export const formatDateTimeLocal = (
  value: DateInput,
  { fallback = DEFAULT_FALLBACK }: FormatDateLocalOptions = {},
): string => {
  const date = toDate(value);
  if (!date) {
    return fallback;
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};
