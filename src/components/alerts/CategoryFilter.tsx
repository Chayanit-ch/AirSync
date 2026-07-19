import { useTranslation } from "../../hooks/useTranslation";

export type ArticleFilter = "all" | "pm25" | "health";

const FILTERS: { id: ArticleFilter; key: "filterAll" | "filterPm25" | "filterHealth" }[] = [
  { id: "all", key: "filterAll" },
  { id: "pm25", key: "filterPm25" },
  { id: "health", key: "filterHealth" },
];

interface CategoryFilterProps {
  active: ArticleFilter;
  onChange: (filter: ArticleFilter) => void;
}

export function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2 overflow-x-auto">
      {FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onChange(filter.id)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            active === filter.id
              ? "bg-brand-600 text-white"
              : "border border-gray-200 bg-white text-gray-600"
          }`}
        >
          {t(`alerts.${filter.key}`)}
        </button>
      ))}
    </div>
  );
}
