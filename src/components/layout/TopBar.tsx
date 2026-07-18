import { Menu, Wind } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { ProfileDropdown } from "./ProfileDropdown";

export function TopBar() {
  const { language, setLanguage } = useLanguage();

  return (
    <header className="z-30 flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          aria-label="เปิดเมนู"
          className="text-brand-700 -ml-1 rounded-lg p-1.5 hover:bg-gray-50 active:bg-gray-100"
        >
          <Menu size={22} strokeWidth={2.25} />
        </button>
        <div className="flex items-center gap-1.5">
          <Wind size={22} className="text-brand-600" strokeWidth={2.5} />
          <span className="text-brand-700 text-lg font-bold tracking-tight">
            AirSync
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-gray-200 bg-gray-50 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setLanguage("th")}
            className={`rounded-full px-2.5 py-1 transition-colors ${
              language === "th"
                ? "bg-brand-100 text-brand-700"
                : "text-gray-400"
            }`}
          >
            TH
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`rounded-full px-2.5 py-1 transition-colors ${
              language === "en"
                ? "bg-brand-100 text-brand-700"
                : "text-gray-400"
            }`}
          >
            EN
          </button>
        </div>
        <ProfileDropdown />
      </div>
    </header>
  );
}
