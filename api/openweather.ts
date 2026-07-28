// Vercel serverless function — proxies OpenWeather's Current Weather API
// (https://openweathermap.org/current) as a *last-resort* source for
// temperature/humidity only, used by the frontend when neither Air4Thai nor
// WAQI reports temperature for a station. Never used for AQI/PM2.5 — that
// stays exclusively Air4Thai/WAQI (see `api/air4thai.ts` / `api/waqi.ts`),
// which are real ground-station measurements OpenWeather's modeled air
// pollution data can't match.
//
// Endpoint used exactly as documented at https://openweathermap.org/current,
// the free-tier `data/2.5/weather` call:
//   https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={key}&units=metric
//     -> { main: { temp, humidity, ... }, ... }
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const FETCH_TIMEOUT_MS = 8000;
/** 20 minutes — inside the requested 15-30 min window. */
const CACHE_TTL_MS = 20 * 60 * 1000;

interface WeatherResult {
  temperature: number;
  humidity: number;
}

interface OpenWeatherResponse {
  main?: { temp?: number; humidity?: number };
}

interface CacheEntry {
  fetchedAtMs: number;
  weather: WeatherResult | null;
}

// Module-level cache — persists across invocations on a warm serverless
// instance, same pattern as `api/air4thai.ts` / `api/waqi.ts`. Keys are
// rounded to 2 decimal places (~1.1km) so nearby stations/requests share a
// cache entry instead of each burning a separate OpenWeather call.
const cache = new Map<string, CacheEntry>();

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

async function fetchOpenWeather(lat: number, lng: number): Promise<WeatherResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `${OPENWEATHER_URL}?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`OpenWeather responded with HTTP ${response.status}`);
    }
    const raw = (await response.json()) as OpenWeatherResponse;
    const temp = raw.main?.temp;
    const humidity = raw.main?.humidity;
    if (typeof temp !== "number" || typeof humidity !== "number") {
      throw new Error("OpenWeather response missing main.temp/main.humidity");
    }
    return { temperature: Math.round(temp * 10) / 10, humidity: Math.round(humidity) };
  } finally {
    clearTimeout(timeoutId);
  }
}

interface JsonResponse {
  status: (code: number) => { json: (body: unknown) => void };
  setHeader: (name: string, value: string) => void;
}

// Loose (non-@vercel/node) req/res typing intentionally, matching
// `api/air4thai.ts` / `api/waqi.ts`.
export default async function handler(
  req: { method?: string; url?: string },
  res: JsonResponse,
) {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

  if (req.method && req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!OPENWEATHER_API_KEY) {
    // Never crash — the frontend's fallback chain already ends at "No Data"
    // when this reports unavailable.
    res.status(200).json({ ok: false, error: "OpenWeather API key not configured", weather: null });
    return;
  }

  const url = new URL(req.url ?? "", "http://localhost");
  const latParam = url.searchParams.get("lat");
  const lngParam = url.searchParams.get("lng");
  const lat = latParam === null ? NaN : Number(latParam);
  const lng = lngParam === null ? NaN : Number(lngParam);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ ok: false, error: "Missing lat/lng query parameter" });
    return;
  }

  const key = cacheKey(lat, lng);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.fetchedAtMs < CACHE_TTL_MS) {
    res.status(200).json({ ok: true, source: "openweather", cached: true, weather: cached.weather });
    return;
  }

  try {
    const weather = await fetchOpenWeather(lat, lng);
    cache.set(key, { fetchedAtMs: now, weather });
    res.status(200).json({ ok: true, source: "openweather", cached: false, weather });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (cached) {
      res.status(200).json({
        ok: true,
        source: "openweather",
        cached: true,
        stale: true,
        weather: cached.weather,
        warning: `Serving stale OpenWeather cache — live refetch failed: ${message}`,
      });
      return;
    }
    // Never crash the caller — OpenWeather is a last-resort fallback for a
    // supplementary field, so a failure here just means "no temperature",
    // not an app error.
    res.status(200).json({ ok: false, error: message, weather: null });
  }
}
