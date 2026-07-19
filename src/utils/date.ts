import type { LanguageCode } from "../contexts/LanguageContext";

/**
 * Formats a date as "D MMM YY" — Buddhist Era year in Thai (matching how
 * dates are conventionally shown in Thai apps), Gregorian in English.
 * `months` should come from the active `useTranslation()` dictionary
 * (`dict.common.months`) so the month abbreviations always match the
 * current language instead of a second hard-coded array.
 */
export function formatLocalizedDate(
  date: Date,
  language: LanguageCode,
  months: readonly string[],
): string {
  const year = language === "th" ? (date.getFullYear() + 543) % 100 : date.getFullYear() % 100;
  return `${date.getDate()} ${months[date.getMonth()]} ${year}`;
}

export function formatLocalizedTime(date: Date, language: LanguageCode): string {
  return date.toLocaleTimeString(language === "th" ? "th-TH" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
