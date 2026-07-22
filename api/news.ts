// Vercel serverless function — auto-detected because it lives in the
// root-level `api/` directory. No extra Vercel config needed.
//
// Copyright-safe news proxy: fetches public RSS feeds, keeps ONLY the
// headline, the feed's own summary/description, source, and the original
// article link — never the full article body, and never anything scraped
// from the article page itself. The frontend (`NewsFeedSection`) must always
// link out to the original URL for the full text.
//
// Sources verified live (2026-07-22) to be public, unauthenticated, valid
// RSS 2.0 with no bot paywall:
//   - Thairath (Thai):          https://www.thairath.co.th/rss/news
//   - Khaosod English (English): https://www.khaosodenglish.com/feed/
// Deliberately NOT used:
//   - Bangkok Post's RSS now returns HTTP 402 behind a TollBit AI-bot
//     licensing paywall — using it without a paid license would violate
//     their terms.
//   - Pollution Control Department (PCD) and Thai PBS have no discoverable
//     public RSS feed as of this writing.
import Parser from "rss-parser";

const FEEDS = [
  { url: "https://www.thairath.co.th/rss/news", source: "Thairath" },
  { url: "https://www.khaosodenglish.com/feed/", source: "Khaosod English" },
];

/** ~45 minutes — inside the requested 30-60 min window. */
const CACHE_TTL_MS = 45 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

const KEYWORDS = [
  // English
  "pm2.5",
  "pm 2.5",
  "air quality",
  "air pollution",
  "pollution",
  "haze",
  "smog",
  "dust",
  // Thai
  "ฝุ่น",
  "pm2.5",
  "มลพิษ",
  "อากาศ",
  "หมอกควัน",
  "สิ่งแวดล้อม",
];

interface NewsArticle {
  title: string;
  summary: string;
  link: string;
  source: string;
  publishedAt: string | null;
}

interface CacheEntry {
  fetchedAtMs: number;
  articles: NewsArticle[];
}

// Module-level = the simple in-memory cache; persists across invocations on
// a warm serverless instance, same pattern as `api/air4thai.ts`.
let cache: CacheEntry | null = null;

function matchesKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()));
}

async function fetchFeed(parser: Parser, feed: { url: string; source: string }): Promise<NewsArticle[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: { "User-Agent": "AirSyncNewsBot/1.0 (+https://airsync.app)" },
    });
    if (!response.ok) {
      throw new Error(`${feed.source} responded with HTTP ${response.status}`);
    }
    const xml = await response.text();
    const parsed = await parser.parseString(xml);

    return (parsed.items ?? [])
      .map((item) => {
        const title = item.title?.trim() ?? "";
        // Only ever the feed's own snippet/description — never generated or
        // scraped from the article page.
        const summary = (item.contentSnippet ?? item.summary ?? item.content ?? "").trim();
        const link = item.link?.trim() ?? "";
        if (!title || !link) return null;
        if (!matchesKeywords(`${title} ${summary}`)) return null;
        return {
          title,
          summary,
          link,
          source: feed.source,
          publishedAt: item.isoDate ?? item.pubDate ?? null,
        };
      })
      .filter((article): article is NewsArticle => article !== null);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAllFeeds(): Promise<NewsArticle[]> {
  const parser = new Parser();
  const results = await Promise.allSettled(FEEDS.map((feed) => fetchFeed(parser, feed)));

  const articles: NewsArticle[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") articles.push(...result.value);
  }
  // If every single feed failed, surface that as a real error rather than a
  // silent empty success — matches this app's no-silent-fallbacks rule.
  if (articles.length === 0 && results.every((r) => r.status === "rejected")) {
    const reasons = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
    throw new Error(`All news feeds failed: ${reasons.join("; ")}`);
  }

  articles.sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime;
  });
  return articles;
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
    });
    return;
  }

  try {
    const articles = await fetchAllFeeds();
    cache = { fetchedAtMs: now, articles };
    res.status(200).json({
      ok: true,
      cached: false,
      fetchedAt: new Date(cache.fetchedAtMs).toISOString(),
      articles: cache.articles,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (cache) {
      res.status(200).json({
        ok: true,
        cached: true,
        stale: true,
        fetchedAt: new Date(cache.fetchedAtMs).toISOString(),
        articles: cache.articles,
        warning: `Serving stale cache — live refetch failed: ${message}`,
      });
      return;
    }

    res.status(502).json({ ok: false, error: message });
  }
}
