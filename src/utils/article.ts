import type { LanguageCode } from "../contexts/LanguageContext";
import type { ArticleCategory, KnowledgeArticle } from "../types";

interface CategoryMeta {
  pillClass: string;
  textClass: string;
}

/**
 * Styling only — the display label is language-dependent (see
 * `dict.alerts.categories` in `useTranslation()`), so it's not duplicated
 * here as a third, Thai-only copy of the same three category names.
 */
export const ARTICLE_CATEGORY_META: Record<ArticleCategory, CategoryMeta> = {
  prevention: {
    pillClass: "bg-teal-500 text-white",
    textClass: "text-teal-600",
  },
  pm25: {
    pillClass: "bg-brand-600 text-white",
    textClass: "text-brand-600",
  },
  health: {
    pillClass: "bg-blue-600 text-white",
    textClass: "text-blue-600",
  },
};

/**
 * `titleEn`/`excerptEn`/`contentEn` are optional per-article translations
 * (not every seeded article has them yet) — falls back to the Thai field
 * when the English one is missing so switching language never blanks a card.
 */
export function getLocalizedArticleText(article: KnowledgeArticle, language: LanguageCode) {
  if (language === "en") {
    return {
      title: article.titleEn || article.title,
      excerpt: article.excerptEn || article.excerpt,
      content: article.contentEn || article.content,
    };
  }
  return { title: article.title, excerpt: article.excerpt, content: article.content };
}
