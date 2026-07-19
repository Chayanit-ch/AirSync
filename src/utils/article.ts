import type { ArticleCategory } from "../types";

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
