export type ArticleFilter = "all" | "pm25" | "health";

const FILTERS: { id: ArticleFilter; label: string }[] = [
  { id: "all", label: "เนื้อหาทั้งหมด" },
  { id: "pm25", label: "PM 2.5" },
  { id: "health", label: "สุขภาพ" },
];

interface CategoryFilterProps {
  active: ArticleFilter;
  onChange: (filter: ArticleFilter) => void;
}

export function CategoryFilter({ active, onChange }: CategoryFilterProps) {
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
          {filter.label}
        </button>
      ))}
    </div>
  );
}
