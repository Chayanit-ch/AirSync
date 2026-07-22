import { Timestamp } from "firebase/firestore";
import type {
  Alert,
  HistoricalAQIData,
  KnowledgeArticle,
  MonitoringStation,
  PollutionReport,
  UserProfile,
} from "../types";
import { getAqiSeverity, pm25ToAqi } from "../utils/aqi";

/** Centralized mock data for AirSync. Swap for Firestore reads later without touching components. */

// -- Current user (mocked "logged out" preview / fallback only; the real,
// logged-in session is always sourced from Firestore via AuthContext) --------

export const currentUser: UserProfile = {
  uid: "user-001",
  displayName: "สมหญิง รักสะอาด",
  email: "baitoey8344@gmail.com",
  photoURL: "https://i.pravatar.cc/150?img=47",
  role: "citizen",
  points: 1200,
  followedAreaIds: ["area-ban-phaeo", "area-mueang", "area-krathum-baen"],
  notificationSettings: {
    pushEnabled: true,
    dailySummaryEnabled: false,
  },
  createdAt: Timestamp.fromDate(new Date("2025-11-02T08:00:00+07:00")),
  updatedAt: Timestamp.fromDate(new Date("2025-11-02T08:00:00+07:00")),
};

// -- Monitoring stations (Samut Sakhon pilot area) -----------------------------

function buildStation(
  input: Omit<MonitoringStation, "currentAqi" | "severity" | "source">,
): MonitoringStation {
  const currentAqi = pm25ToAqi(input.currentPm25);
  return { ...input, currentAqi, severity: getAqiSeverity(currentAqi), source: "mock" };
}

export const monitoringStations: MonitoringStation[] = [
  buildStation({
    id: "station-01",
    name: "โรงเรียนสมุทรสาครบูรณะ",
    nameEn: "Samut Sakhon Burana School",
    address: "ถ.นรสิงห์ อ.เมือง 74000",
    district: "เมืองสมุทรสาคร",
    province: "สมุทรสาคร",
    location: { lat: 13.5475, lng: 100.2745 },
    currentPm25: 28.4,
    temperature: 32,
    lastUpdated: "2026-07-17T14:00:00+07:00",
  }),
  buildStation({
    id: "station-02",
    name: "เทศบาลตำบลอ้อมน้อย",
    nameEn: "Om Noi Subdistrict Municipality",
    address: "ถ.เพชรเกษม ต.อ้อมน้อย อ.กระทุ่มแบน 74130",
    district: "กระทุ่มแบน",
    province: "สมุทรสาคร",
    location: { lat: 13.6862, lng: 100.323 },
    currentPm25: 140,
    temperature: 34,
    lastUpdated: "2026-07-17T14:00:00+07:00",
  }),
  buildStation({
    id: "station-03",
    name: "วัดใจดี",
    nameEn: "Wat Jai Dee",
    address: "ต.บ้านแพ้ว อ.บ้านแพ้ว 74120",
    district: "บ้านแพ้ว",
    province: "สมุทรสาคร",
    location: { lat: 13.529, lng: 100.098 },
    currentPm25: 155,
    temperature: 33,
    lastUpdated: "2026-07-17T13:00:00+07:00",
  }),
  buildStation({
    id: "station-04",
    name: "ตลาดมหาชัย",
    nameEn: "Maha Chai Market",
    address: "ถ.สุคนธวิท อ.เมือง 74000",
    district: "เมืองสมุทรสาคร",
    province: "สมุทรสาคร",
    location: { lat: 13.5488, lng: 100.2751 },
    currentPm25: 20,
    temperature: 31,
    lastUpdated: "2026-07-17T14:00:00+07:00",
  }),
  buildStation({
    id: "station-05",
    name: "ถนนพระราม 2",
    nameEn: "Rama II Road",
    address: "ถ.พระราม 2 อ.เมือง 74000",
    district: "เมืองสมุทรสาคร",
    province: "สมุทรสาคร",
    location: { lat: 13.598, lng: 100.274 },
    currentPm25: 45,
    temperature: 33,
    lastUpdated: "2026-07-17T13:30:00+07:00",
  }),
  buildStation({
    id: "station-06",
    name: "สวนสาธารณะเทศบาลเมืองสมุทรสาคร",
    nameEn: "Samut Sakhon Municipal Park",
    address: "ถ.เอกชัย อ.เมือง 74000",
    district: "เมืองสมุทรสาคร",
    province: "สมุทรสาคร",
    location: { lat: 13.5401, lng: 100.281 },
    currentPm25: 8,
    temperature: 31,
    lastUpdated: "2026-07-17T14:00:00+07:00",
  }),
];

export const heatmapPoints: [number, number, number][] = monitoringStations.map(
  (s) => [s.location.lat, s.location.lng, Math.min(s.currentAqi / 250, 1)],
);

// -- 24h AQI trend (Home page chart) -------------------------------------------

export const trend24h: HistoricalAQIData[] = [
  { period: "hourly", label: "00:00", aqi: 188, pm25: 118, timestamp: "2026-07-17T00:00:00+07:00" },
  { period: "hourly", label: "03:00", aqi: 210, pm25: 132, timestamp: "2026-07-17T03:00:00+07:00" },
  { period: "hourly", label: "06:00", aqi: 225, pm25: 141, timestamp: "2026-07-17T06:00:00+07:00" },
  { period: "hourly", label: "09:00", aqi: 190, pm25: 119, timestamp: "2026-07-17T09:00:00+07:00" },
  { period: "hourly", label: "12:00", aqi: 152, pm25: 96, timestamp: "2026-07-17T12:00:00+07:00" },
  { period: "hourly", label: "15:00", aqi: 170, pm25: 106, timestamp: "2026-07-17T15:00:00+07:00" },
  { period: "hourly", label: "18:00", aqi: 212, pm25: 133, timestamp: "2026-07-17T18:00:00+07:00" },
  { period: "hourly", label: "21:00", aqi: 205, pm25: 129, timestamp: "2026-07-17T21:00:00+07:00" },
];

// -- Raw air quality history, mirroring the `airQualityRecords` Firestore
// collection shape (see services/airQuality.ts). This is area-level data,
// queried fresh and filtered by a user's followedAreaIds — never stored as
// a per-user array, so there's nothing here for a stale write to clobber.
// Temporary stand-in until Air4Thai ingestion seeds the real collection.

// -- Pollution reports (Report page + Profile page) ----------------------------

export const pollutionReports: PollutionReport[] = [
  {
    id: "report-001",
    userId: "user-001",
    incidentType: "industrial_emissions",
    title: "มลพิษจากโรงงาน",
    description: "พบกลุ่มควันหนาแน่นบริเวณอุตสาหกรรม",
    images: ["https://picsum.photos/seed/airsync-report-1/400/300"],
    location: { lat: 13.598, lng: 100.274, address: "ถนนพระราม 2 สมุทรสาคร" },
    reportedDate: "2026-07-12",
    reportedTime: "12:34",
    status: "under_review",
    createdAt: "2026-07-12T12:34:00+07:00",
  },
  {
    id: "report-002",
    userId: "user-001",
    incidentType: "open_burning",
    title: "เผาขยะ",
    description: "พบกลุ่มคนกำลังเผาขยะ",
    images: ["https://picsum.photos/seed/airsync-report-2/400/300"],
    location: { lat: 13.529, lng: 100.098, address: "วัดใจดี บ้านแพ้ว สมุทรสาคร" },
    reportedDate: "2026-07-10",
    reportedTime: "01:11",
    status: "resolved",
    createdAt: "2026-07-10T01:11:00+07:00",
  },
  {
    id: "report-003",
    userId: "user-001",
    incidentType: "open_burning",
    title: "พบการเผาขยะริมทาง",
    description: "พบการเผาขยะริมถนนใกล้ที่พักอาศัย ควันลอยเข้าบ้านเรือน",
    images: ["https://picsum.photos/seed/airsync-report-3/400/300"],
    location: { lat: 13.5236, lng: 100.0918, address: "บ้านแพ้ว สมุทรสาคร" },
    reportedDate: "2026-07-14",
    reportedTime: "09:20",
    status: "in_progress",
    createdAt: "2026-07-14T09:20:00+07:00",
  },
  {
    id: "report-004",
    userId: "user-001",
    incidentType: "other",
    title: "พบการเผาขยะริมทาง",
    description: "ฝุ่นละอองหนาแน่นผิดปกติในช่วงเช้า",
    images: ["https://picsum.photos/seed/airsync-report-4/400/300"],
    location: { lat: 13.5236, lng: 100.0918, address: "บ้านแพ้ว สมุทรสาคร" },
    reportedDate: "2026-07-12",
    reportedTime: "07:45",
    status: "resolved",
    createdAt: "2026-07-12T07:45:00+07:00",
  },
];

// -- Alerts (system notifications) ----------------------------------------------

export const alerts: Alert[] = [
  {
    id: "alert-001",
    title: "คุณภาพอากาศแย่ลงในพื้นที่บ้านแพ้ว",
    message: "ดัชนีคุณภาพอากาศพุ่งสูงถึง 205 (มีผลเสียต่อสุขภาพ) ควรหลีกเลี่ยงกิจกรรมกลางแจ้ง",
    severity: "unhealthy",
    areaName: "บ้านแพ้ว",
    createdAt: "2026-07-17T06:00:00+07:00",
    isRead: false,
  },
  {
    id: "alert-002",
    title: "อัปเดตสถานะรายงานของคุณ",
    message: "รายงาน \"เผาขยะ\" ของคุณได้รับการแก้ไขแล้ว",
    severity: "info",
    createdAt: "2026-07-10T18:00:00+07:00",
    isRead: true,
  },
  {
    id: "alert-003",
    title: "คุณภาพอากาศในกระทุ่มแบนเริ่มมีผลต่อสุขภาพ",
    message: "ดัชนีคุณภาพอากาศอยู่ที่ 135 กลุ่มเสี่ยงควรสวมหน้ากากอนามัย",
    severity: "sensitive",
    areaName: "กระทุ่มแบน",
    createdAt: "2026-07-09T07:30:00+07:00",
    isRead: true,
  },
];

// -- Knowledge articles / news feed (Alerts page) -------------------------------

export const featuredArticle: KnowledgeArticle = {
  id: "article-001",
  title: "รับมือวิกฤตคุณภาพอากาศย่ำแย่ ฉบับปี 2026",
  excerpt:
    "รวมแนวทางป้องกันและรับมือฝุ่น PM2.5 สำหรับประชาชนในพื้นที่สมุทรสาครช่วงวิกฤตหมอกควัน",
  category: "prevention",
  imageUrl: "https://picsum.photos/seed/airsync-featured/800/450",
  readTimeMinutes: 10,
  publishedAt: "2026-07-16T09:00:00+07:00",
  isFeatured: true,
};

export const knowledgeArticles: KnowledgeArticle[] = [
  {
    id: "article-002",
    title: "เจาะลึก PM2.5 ในสมุทรสาคร มีข้อมูลอะไรบ้าง",
    excerpt: "สำรวจแหล่งกำเนิดฝุ่น PM2.5 หลักในพื้นที่สมุทรสาครและแนวโน้มล่าสุด",
    category: "pm25",
    imageUrl: "https://picsum.photos/seed/airsync-article-2/200/200",
    readTimeMinutes: 10,
    publishedAt: "2026-07-15T09:00:00+07:00",
  },
  {
    id: "article-003",
    title: "เทคโนโลยีใหม่ในการจัดการฝุ่น PM 2.5",
    excerpt: "เทคโนโลยีตรวจวัดและลดฝุ่นละอองที่กำลังถูกนำมาใช้ในภาคอุตสาหกรรม",
    category: "health",
    imageUrl: "https://picsum.photos/seed/airsync-article-3/200/200",
    readTimeMinutes: 10,
    publishedAt: "2026-07-14T09:00:00+07:00",
  },
  {
    id: "article-004",
    title: "นโยบายป้องกันฝุ่นเบื้องต้น",
    excerpt: "มาตรการเบื้องต้นที่ประชาชนสามารถทำได้เพื่อลดผลกระทบจากฝุ่น PM2.5",
    category: "health",
    imageUrl: "https://picsum.photos/seed/airsync-article-4/200/200",
    readTimeMinutes: 10,
    publishedAt: "2026-07-13T09:00:00+07:00",
  },
  {
    id: "article-005",
    title: "หน้ากากอนามัยแบบไหนป้องกัน PM2.5 ได้ดีที่สุด",
    excerpt: "เปรียบเทียบหน้ากากอนามัยชนิดต่างๆ และประสิทธิภาพในการกรองฝุ่น PM2.5",
    category: "health",
    imageUrl: "https://picsum.photos/seed/airsync-article-5/200/200",
    readTimeMinutes: 7,
    publishedAt: "2026-07-11T09:00:00+07:00",
  },
];
