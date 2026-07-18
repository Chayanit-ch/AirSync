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

export function getAqiSeverity(aqi: number): AQISeverityLevel {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "sensitive";
  return "unhealthy";
}

interface SeverityMeta {
  labelTh: string;
  labelEn: string;
  recommendationTh: string;
  textClass: string;
  bgClass: string;
  softBgClass: string;
  borderClass: string;
  dotClass: string;
}

export const AQI_SEVERITY_META: Record<AQISeverityLevel, SeverityMeta> = {
  good: {
    labelTh: "อากาศดี",
    labelEn: "Good",
    recommendationTh: "คุณภาพอากาศดี เหมาะสำหรับกิจกรรมกลางแจ้ง",
    textClass: "text-aqi-good",
    bgClass: "bg-aqi-good",
    softBgClass: "bg-aqi-good-bg",
    borderClass: "border-aqi-good",
    dotClass: "bg-aqi-good",
  },
  moderate: {
    labelTh: "ปานกลาง",
    labelEn: "Moderate",
    recommendationTh: "กลุ่มเสี่ยงควรลดกิจกรรมกลางแจ้งที่ใช้แรงมาก",
    textClass: "text-aqi-moderate",
    bgClass: "bg-aqi-moderate",
    softBgClass: "bg-aqi-moderate-bg",
    borderClass: "border-aqi-moderate",
    dotClass: "bg-aqi-moderate",
  },
  sensitive: {
    labelTh: "เริ่มมีผลต่อสุขภาพ",
    labelEn: "Unhealthy for Sensitive Groups",
    recommendationTh: "กลุ่มเสี่ยงควรสวมหน้ากากอนามัยเมื่ออยู่กลางแจ้ง",
    textClass: "text-aqi-sensitive",
    bgClass: "bg-aqi-sensitive",
    softBgClass: "bg-aqi-sensitive-bg",
    borderClass: "border-aqi-sensitive",
    dotClass: "bg-aqi-sensitive",
  },
  unhealthy: {
    labelTh: "มีผลเสียต่อสุขภาพ",
    labelEn: "Unhealthy",
    recommendationTh: "สวมหน้ากากอนามัย และหลีกเลี่ยงกิจกรรมกลางแจ้ง",
    textClass: "text-aqi-unhealthy",
    bgClass: "bg-aqi-unhealthy",
    softBgClass: "bg-aqi-unhealthy-bg",
    borderClass: "border-aqi-unhealthy",
    dotClass: "bg-aqi-unhealthy",
  },
};
