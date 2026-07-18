import type { ArticleCategory } from "../types";

interface CategoryMeta {
  label: string;
  pillClass: string;
  textClass: string;
}

export const ARTICLE_CATEGORY_META: Record<ArticleCategory, CategoryMeta> = {
  prevention: {
    label: "การป้องกัน",
    pillClass: "bg-teal-500 text-white",
    textClass: "text-teal-600",
  },
  pm25: {
    label: "PM 2.5",
    pillClass: "bg-brand-600 text-white",
    textClass: "text-brand-600",
  },
  health: {
    label: "สุขภาพ",
    pillClass: "bg-blue-600 text-white",
    textClass: "text-blue-600",
  },
};
