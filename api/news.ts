// Vercel serverless function — auto-detected because it lives in the
// root-level `api/` directory. No extra Vercel config needed.
//
// Copyright-safe news proxy: fetches public RSS feeds, keeps ONLY the
// headline, the feed's own summary/description, source, and the original
// article link — never the full article body, and never anything scraped
// from the article page itself. The frontend (`NewsFeedSection`) must always
// link out to the original URL for the full text.
//
// Sources verified live (2026-07-22/23) to be public, unauthenticated, valid
// RSS 2.0 with no bot paywall:
//   - Thairath (Thai):           https://www.thairath.co.th/rss/news
//   - Khaosod English (English): https://www.khaosodenglish.com/feed/
//   - Matichon (Thai):           https://www.matichon.co.th/feed
//   - Prachachat (Thai):         https://www.prachachat.net/feed
//   - GreenNews (Thai, dedicated environmental news agency): https://www.greennews.agency/?feed=rss2
// Deliberately NOT used:
//   - Bangkok Post's RSS now returns HTTP 402 behind a TollBit AI-bot
//     licensing paywall — using it without a paid license would violate
//     their terms.
//   - Pollution Control Department (PCD), Thai PBS, PPTV36, Bangkok Biz
//     News, and Springnews have no discoverable public RSS feed as of this
//     writing (checked directly, not guessed). Dailynews' feed
//     (dailynews.co.th/feed/) is valid RSS but currently returns zero
//     `<item>` entries, so it wasn't worth including.
import Parser from "rss-parser";

const FEEDS = [
  { url: "https://www.thairath.co.th/rss/news", source: "Thairath" },
  { url: "https://www.khaosodenglish.com/feed/", source: "Khaosod English" },
  { url: "https://www.matichon.co.th/feed", source: "Matichon" },
  { url: "https://www.prachachat.net/feed", source: "Prachachat" },
  { url: "https://www.greennews.agency/?feed=rss2", source: "GreenNews" },
];

/** ~45 minutes — inside the requested 30-60 min window. */
const CACHE_TTL_MS = 45 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

// PM2.5 / air-quality / pollution keywords — an article matching any of
// these is classified `category: "pm25"`.
const PM25_KEYWORDS = [
  // English
  "pm2.5",
  "pm 2.5",
  "air quality",
  "air pollution",
  "pollution",
  "aqi",
  "haze",
  "smog",
  "dust",
  "wildfire",
  "carbon emission",
  // Thai
  "ฝุ่น",
  "ฝุ่นละออง",
  "ฝุ่นพิษ",
  "มลพิษทางอากาศ",
  "คุณภาพอากาศ",
  "ค่าฝุ่น",
  "หมอกควัน",
  "มลพิษ",
  "สิ่งแวดล้อม",
  "ไฟป่า",
  "เผาป่า",
  "การเผา",
];

// Health keywords — checked only if an article didn't already match a PM2.5
// keyword above, so an article that's both (common — "PM2.5 harms health")
// is classified `"pm25"`, matching this app's core air-quality focus.
const HEALTH_KEYWORDS = [
  "สุขภาพ",
  "โรค",
  "ทางเดินหายใจ",
  "ภูมิแพ้",
  "ผู้สูงอายุ",
  "เด็ก",
  "ผลกระทบต่อสุขภาพ",
  "health",
  "disease",
  "respiratory",
];

type NewsCategory = "pm25" | "health";

interface NewsArticle {
  title: string;
  summary: string;
  link: string;
  source: string;
  publishedAt: string | null;
  category: NewsCategory;
}

interface SourceStatus {
  source: string;
  status: "ok" | "empty" | "failed";
  count: number;
  error?: string;
}

interface CacheEntry {
  fetchedAtMs: number;
  articles: NewsArticle[];
  sources: SourceStatus[];
}

// Module-level = the simple in-memory cache; persists across invocations on
// a warm serverless instance, same pattern as `api/air4thai.ts`.
let cache: CacheEntry | null = null;

function matchesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function classify(text: string): NewsCategory | null {
  if (matchesAny(text, PM25_KEYWORDS)) return "pm25";
  if (matchesAny(text, HEALTH_KEYWORDS)) return "health";
  return null;
}

async function fetchFeed(
  parser: Parser,
  feed: { url: string; source: string },
): Promise<{ articles: NewsArticle[]; status: SourceStatus }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: { "User-Agent": "AirSyncNewsBot/1.0 (+https://airsync.app)" },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const xml = await response.text();
    const parsed = await parser.parseString(xml);

    const articles = (parsed.items ?? [])
      .map((item) => {
        const title = item.title?.trim() ?? "";
        // Only ever the feed's own snippet/description — never generated or
        // scraped from the article page.
        const summary = (item.contentSnippet ?? item.summary ?? item.content ?? "").trim();
        const link = item.link?.trim() ?? "";
        if (!title || !link) return null;
        const category = classify(`${title} ${summary}`);
        if (!category) return null;
        return {
          title,
          summary,
          link,
          source: feed.source,
          publishedAt: item.isoDate ?? item.pubDate ?? null,
          category,
        };
      })
      .filter((article): article is NewsArticle => article !== null);

    return {
      articles,
      status: { source: feed.source, status: articles.length > 0 ? "ok" : "empty", count: articles.length },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { articles: [], status: { source: feed.source, status: "failed", count: 0, error: message } };
  } finally {
    clearTimeout(timeout);
  }
}

function dedupeByTitle(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  const result: NewsArticle[] = [];
  for (const article of articles) {
    const key = article.title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(article);
  }
  return result;
}

async function fetchAllFeeds(): Promise<{ articles: NewsArticle[]; sources: SourceStatus[] }> {
  const parser = new Parser();
  const results = await Promise.all(FEEDS.map((feed) => fetchFeed(parser, feed)));

  const sources = results.map((r) => r.status);
  // Every source's outcome is logged individually — a partial failure (one
  // feed down, others fine) must never pass silently just because the
  // overall request still returns 200.
  for (const status of sources) {
    if (status.status === "failed") {
      console.warn(`RSS source unavailable: ${status.source} — ${status.error}`);
    } else if (status.status === "empty") {
      console.warn(`RSS source returned 0 matching articles: ${status.source}`);
    }
  }
  console.log(
    "RSS Status:",
    sources
      .map((s) => `${s.status === "ok" ? "✓" : "✗"} ${s.source}: ${s.status === "failed" ? `Failed (${s.error})` : `${s.count} articles`}`)
      .join(" | "),
  );

  const allArticles = results.flatMap((r) => r.articles);
  if (allArticles.length === 0 && sources.every((s) => s.status === "failed")) {
    throw new Error(`All ${FEEDS.length} RSS sources failed: ${sources.map((s) => `${s.source} (${s.error})`).join("; ")}`);
  }

  const deduped = dedupeByTitle(allArticles);
  deduped.sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime;
  });

  return { articles: deduped, sources };
}

// Loose (non-@vercel/node) req/res typing intentionally — matches
// `api/air4thai.ts`'s handler shape (no @vercel/node dependency in this repo).
export default async function handler(req: { method?: string }, res: {
  status: (code: number) => { json: (body: unknown) => void };
  setHeader: (name: string, value: string) => void;
}) {
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");

  if (req.method && req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const now = Date.now();
  if (cache && now - cache.fetchedAtMs < CACHE_TTL_MS) {
    res.status(200).json({
      ok: true,
      cached: true,
      fetchedAt: new Date(cache.fetchedAtMs).toISOString(),
      articles: cache.articles,
      sources: cache.sources,
    });
    return;
  }

  try {
    const { articles, sources } = await fetchAllFeeds();
    cache = { fetchedAtMs: now, articles, sources };
    res.status(200).json({
      ok: true,
      cached: false,
      fetchedAt: new Date(cache.fetchedAtMs).toISOString(),
      articles: cache.articles,
      sources: cache.sources,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (cache) {
      console.warn(`RSS feed unavailable, falling back to cached data: ${message}`);
      res.status(200).json({
        ok: true,
        cached: true,
        stale: true,
        fetchedAt: new Date(cache.fetchedAtMs).toISOString(),
        articles: cache.articles,
        sources: cache.sources,
        warning: `Serving stale cache — live refetch failed: ${message}`,
      });
      return;
    }

    console.error(`RSS news fetch failed with no cache available: ${message}`);
    res.status(502).json({ ok: false, error: message });
  }
}
