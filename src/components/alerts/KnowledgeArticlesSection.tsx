import { CircleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { getKnowledgeArticles } from "../../services/knowledgeArticles";
import { ARTICLE_CATEGORY_META } from "../../utils/article";
import type { ArticleFilter } from "./CategoryFilter";
import type { KnowledgeArticle } from "../../types";

interface KnowledgeArticlesSectionProps {
  /** Same category filter + search bar driving the RSS section above it — one filter bar, both sections respond. */
  filter: ArticleFilter;
  searchQuery: string;
}

/**
 * Real Firestore-backed replacement for the old mock `knowledgeArticles`
 * list — reads `knowledgeArticles/{id}` via `getKnowledgeArticles()` (see
 * `scripts/seed-articles.ts` for how these are seeded/managed).
 */
export function KnowledgeArticlesSection({ filter, searchQuery }: KnowledgeArticlesSectionProps) {
  const { t, dict } = useTranslation();
  const [articles, setArticles] = useState<KnowledgeArticle[] | null>(null);
  const [error, setError] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    getKnowledgeArticles()
      .then((data) => {
        if (!cancelled) setArticles(data);
      })
      .catch((err) => {
        console.error("Failed to load knowledgeArticles from Firestore", err);
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
        article.excerpt.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [articles, filter, searchQuery]);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <h2 className="border-brand-600 mb-3 border-l-4 pl-2.5 text-lg font-bold text-gray-800">
        {t("alerts.knowledgeArticles")}
      </h2>
      {error ? (
        <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-400 shadow-sm">
          <CircleAlert size={16} className="shrink-0" />
          {t("alerts.knowledgeLoadError")}
        </div>
      ) : articles === null ? (
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : visibleArticles.length === 0 ? (
        <p className="rounded-2xl border border-gray-100 bg-white p-4 text-center text-sm text-gray-400 shadow-sm">
          {articles.length === 0 ? t("alerts.knowledgeEmpty") : t("alerts.newsNoMatch")}
        </p>
      ) : (
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-3">
          {visibleArticles.map((article) => {
            const meta = ARTICLE_CATEGORY_META[article.category];
            // Only offer "read full article" when there's genuinely more
            // text than the excerpt already shown — otherwise the button
            // would expand into a exact copy of what's already visible.
            const hasFullContent = Boolean(article.content && article.content !== article.excerpt);
            const isExpanded = expandedIds.has(article.id);
            return (
              <div
                key={article.id}
                className="flex gap-3 overflow-hidden rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
              >
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${meta.pillClass}`}>
                      {dict.alerts.categories[article.category]}
                    </span>
                    <span className="text-xs text-gray-400">
                      {t("alerts.readTime", { minutes: article.readTimeMinutes })}
                    </span>
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-gray-800">{article.title}</h3>
                  <p className={`mt-0.5 text-xs text-gray-500 ${isExpanded ? "" : "line-clamp-2"}`}>
                    {isExpanded && hasFullContent ? article.content : article.excerpt}
                  </p>
                  {hasFullContent && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(article.id)}
                      className="text-brand-600 mt-1 text-xs font-semibold"
                    >
                      {isExpanded ? t("alerts.showLess") : t("alerts.readFullKnowledge")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
