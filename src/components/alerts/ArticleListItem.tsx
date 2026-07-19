import type { KnowledgeArticle } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";
import { ARTICLE_CATEGORY_META } from "../../utils/article";

export function ArticleListItem({ article }: { article: KnowledgeArticle }) {
  const { t, dict } = useTranslation();
  const meta = ARTICLE_CATEGORY_META[article.category];

  return (
    <div className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      <img
        src={article.imageUrl}
        alt={article.title}
        className="h-16 w-16 shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${meta.textClass}`}>
          {dict.alerts.categories[article.category]}
        </p>
        <h3 className="mt-0.5 line-clamp-2 text-sm font-bold text-gray-800">
          {article.title}
        </h3>
        <p className="mt-1 text-xs text-gray-400">
          {t("alerts.readTime", { minutes: article.readTimeMinutes })}
        </p>
      </div>
    </div>
  );
}
