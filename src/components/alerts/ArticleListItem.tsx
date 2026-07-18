import type { KnowledgeArticle } from "../../types";
import { ARTICLE_CATEGORY_META } from "../../utils/article";

export function ArticleListItem({ article }: { article: KnowledgeArticle }) {
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
          {meta.label}
        </p>
        <h3 className="mt-0.5 line-clamp-2 text-sm font-bold text-gray-800">
          {article.title}
        </h3>
        <p className="mt-1 text-xs text-gray-400">
          อ่าน {article.readTimeMinutes} นาที
        </p>
      </div>
    </div>
  );
}
