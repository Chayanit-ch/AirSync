import type { AQISeverityLevel } from "../types";

interface Breakpoint {
  pmLow: number;
  pmHigh: number;
  aqiLow: number;
  aqiHigh: number;
}

/** Simplified US EPA PM2.5 -> AQI breakpoint table, used to keep mock readings internally consistent. */
const BREAKPOINTS: Breakpoint[] = [
  { pmLow: 0, pmHigh: 9.0, aqiLow: 0, aqiHigh: 50 },
  { pmLow: 9.1, pmHigh: 35.4, aqiLow: 51, aqiHigh: 100 },
  { pmLow: 35.5, pmHigh: 55.4, aqiLow: 101, aqiHigh: 150 },
  { pmLow: 55.5, pmHigh: 125.4, aqiLow: 151, aqiHigh: 200 },
  { pmLow: 125.5, pmHigh: 225.4, aqiLow: 201, aqiHigh: 300 },
  { pmLow: 225.5, pmHigh: 325.4, aqiLow: 301, aqiHigh: 500 },
];

export function pm25ToAqi(pm25: number): number {
  const bp =
    BREAKPOINTS.find((b) => pm25 >= b.pmLow && pm25 <= b.pmHigh) ??
    BREAKPOINTS[BREAKPOINTS.length - 1];
  const aqi =
    ((bp.aqiHigh - bp.aqiLow) / (bp.pmHigh - bp.pmLow)) * (pm25 - bp.pmLow) +
    bp.aqiLow;
  return Math.round(aqi);
}

/** Full 6-tier US EPA AQI scale — thresholds match `BREAKPOINTS`' `aqiHigh` values above exactly. */
export function getAqiSeverity(aqi: number): AQISeverityLevel {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "sensitive";
  if (aqi <= 200) return "unhealthy";
  if (aqi <= 300) return "veryUnhealthy";
  return "hazardous";
}

/** Best (lowest index) to worst (highest index) — the single source of truth for "is A worse than B" comparisons (e.g. `useAirQualityAlerts`'s severity-worsened detection). */
export const SEVERITY_ORDER: AQISeverityLevel[] = [
  "good",
  "moderate",
  "sensitive",
  "unhealthy",
  "veryUnhealthy",
  "hazardous",
];

export function isSeverityWorse(current: AQISeverityLevel, previous: AQISeverityLevel): boolean {
  return SEVERITY_ORDER.indexOf(current) > SEVERITY_ORDER.indexOf(previous);
}

/**
 * Styling only — every severity level's display label and health
 * recommendation lives in `dict.common.severity` / `dict.common.severityRecommendation`
 * (see `useTranslation()`), never here. This used to hold `labelTh`/`labelEn`/
 * `recommendationTh`/`recommendationEn` pairs as a second, ad-hoc i18n
 * mechanism alongside the real one — removed so there's exactly one place
 * severity text can come from.
 */
interface SeverityMeta {
  textClass: string;
  bgClass: string;
  softBgClass: string;
  borderClass: string;
  dotClass: string;
}

export const AQI_SEVERITY_META: Record<AQISeverityLevel, SeverityMeta> = {
  good: {
    textClass: "text-aqi-good",
    bgClass: "bg-aqi-good",
    softBgClass: "bg-aqi-good-bg",
    borderClass: "border-aqi-good",
    dotClass: "bg-aqi-good",
  },
  moderate: {
    textClass: "text-aqi-moderate",
    bgClass: "bg-aqi-moderate",
    softBgClass: "bg-aqi-moderate-bg",
    borderClass: "border-aqi-moderate",
    dotClass: "bg-aqi-moderate",
  },
  sensitive: {
    textClass: "text-aqi-sensitive",
    bgClass: "bg-aqi-sensitive",
    softBgClass: "bg-aqi-sensitive-bg",
    borderClass: "border-aqi-sensitive",
    dotClass: "bg-aqi-sensitive",
  },
  unhealthy: {
    textClass: "text-aqi-unhealthy",
    bgClass: "bg-aqi-unhealthy",
    softBgClass: "bg-aqi-unhealthy-bg",
    borderClass: "border-aqi-unhealthy",
    dotClass: "bg-aqi-unhealthy",
  },
  veryUnhealthy: {
    textClass: "text-aqi-very-unhealthy",
    bgClass: "bg-aqi-very-unhealthy",
    softBgClass: "bg-aqi-very-unhealthy-bg",
    borderClass: "border-aqi-very-unhealthy",
    dotClass: "bg-aqi-very-unhealthy",
  },
  hazardous: {
    textClass: "text-aqi-hazardous",
    bgClass: "bg-aqi-hazardous",
    softBgClass: "bg-aqi-hazardous-bg",
    borderClass: "border-aqi-hazardous",
    dotClass: "bg-aqi-hazardous",
  },
};
