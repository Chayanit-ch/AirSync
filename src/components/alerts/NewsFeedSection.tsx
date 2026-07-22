import { CircleAlert, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import type { ArticleFilter } from "./CategoryFilter";

interface NewsArticle {
  title: string;
  summary: string;
  link: string;
  source: string;
  publishedAt: string | null;
  category: "pm25" | "health";
}

interface NewsResponse {
  ok: boolean;
  articles?: NewsArticle[];
  error?: string;
}

interface NewsFeedSectionProps {
  /** Same category filter driving the knowledge-articles list below it, per the shared filter bar at the top of the page. */
  filter: ArticleFilter;
  /** Same search query driving the knowledge-articles list — matched against title, summary, AND source name here. */
  searchQuery: string;
}

/**
 * Copyright-safe RSS news section: shows only the headline, the feed's own
 * summary, source, and publish date — always with an outbound link to the
 * original article (see `api/news.ts`). Never renders full article content.
 */
export function NewsFeedSection({ filter, searchQuery }: NewsFeedSectionProps) {
  const { t, language } = useTranslation();
  const [articles, setArticles] = useState<NewsArticle[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/news")
      .then((res) => res.json() as Promise<NewsResponse>)
      .then((data) => {
        if (cancelled) return;
        if (!data.ok || !data.articles) {
          setError(true);
          return;
        }
        setArticles(data.articles);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleArticles = useMemo(() => {
    if (!articles) return [];
    const query = searchQuery.trim().toLowerCase();
    return articles.filter((article) => {
      const matchesFilter = filter === "all" || article.category === filter;
      const matchesSearch =
        query === "" ||
        article.title.toLowerCase().includes(query) ||
        article.summary.toLowerCase().includes(query) ||
        article.source.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [articles, filter, searchQuery]);

  return (
    <div>
      <h2 className="border-brand-600 mb-3 border-l-4 pl-2.5 text-lg font-bold text-gray-800">
        {t("alerts.latestNews")}
      </h2>
      {error ? (
        <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-400 shadow-sm">
          <CircleAlert size={16} className="shrink-0" />
          {t("alerts.newsLoadError")}
        </div>
      ) : articles === null ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : visibleArticles.length === 0 ? (
        <p className="rounded-2xl border border-gray-100 bg-white p-4 text-center text-sm text-gray-400 shadow-sm">
          {articles.length === 0 ? t("alerts.newsEmpty") : t("alerts.newsNoMatch")}
        </p>
      ) : (
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-3">
          {visibleArticles.map((article) => (
            <div
              key={article.link}
              className="flex flex-col gap-1.5 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm"
            >
              <p className="text-xs font-semibold text-gray-400">
                {article.source}
                {article.publishedAt &&
                  ` · ${new Date(article.publishedAt).toLocaleDateString(
                    language === "th" ? "th-TH" : "en-US",
                    { year: "numeric", month: "short", day: "numeric" },
                  )}`}
              </p>
              <h3 className="line-clamp-2 text-sm font-bold text-gray-800">{article.title}</h3>
              {article.summary && (
                <p className="line-clamp-2 text-xs text-gray-500">{article.summary}</p>
              )}
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 mt-1 flex items-center gap-1 text-xs font-semibold"
              >
                {t("alerts.readFullArticle", { source: article.source })}
                <ExternalLink size={12} />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
