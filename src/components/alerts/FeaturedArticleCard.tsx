import type { KnowledgeArticle } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";
import { ARTICLE_CATEGORY_META } from "../../utils/article";

export function FeaturedArticleCard({
  article,
}: {
  article: KnowledgeArticle;
}) {
  const { t, dict } = useTranslation();
  const meta = ARTICLE_CATEGORY_META[article.category];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <img
        src={article.imageUrl}
        alt={article.title}
        className="h-40 w-full object-cover"
      />
      <div className="p-4">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.pillClass}`}
          >
            {dict.alerts.categories[article.category]}
          </span>
          <span className="text-xs text-gray-400">
            {t("alerts.readTime", { minutes: article.readTimeMinutes })}
          </span>
        </div>
        <h2 className="mt-2 text-lg leading-snug font-bold text-gray-900">
          {article.title}
        </h2>
      </div>
    </div>
  );
}
