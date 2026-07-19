import { Search } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

interface MapSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function MapSearchBar({ value, onChange }: MapSearchBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 shadow-md">
      <Search size={18} className="shrink-0 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("map.searchPlaceholder")}
        className="w-full text-sm text-gray-700 outline-none placeholder:text-gray-400"
      />
    </div>
  );
}
