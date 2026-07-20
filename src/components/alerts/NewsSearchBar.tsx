import { Search } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

interface NewsSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function NewsSearchBar({ value, onChange }: NewsSearchBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm">
      <Search size={18} className="shrink-0 text-gray-400" />
      <input
        type="text"
        id="news-search"
        name="news-search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("alerts.searchPlaceholder")}
        aria-label={t("alerts.searchPlaceholder")}
        className="w-full text-sm text-gray-700 outline-none placeholder:text-gray-400"
      />
    </div>
  );
}
