import { Bell, Home, Map, PlusCircle, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "../../hooks/useTranslation";

const NAV_ITEMS = [
  { to: "/", key: "home", icon: Home, end: true },
  { to: "/map", key: "map", icon: Map, end: false },
  { to: "/report", key: "report", icon: PlusCircle, end: false },
  { to: "/alerts", key: "alerts", icon: Bell, end: false },
  { to: "/profile", key: "profile", icon: User, end: false },
] as const;

export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav className="z-30 shrink-0 border-t border-gray-100 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-between px-1">
        {NAV_ITEMS.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                isActive ? "text-brand-600" : "text-gray-400"
              }`
            }
          >
            <Icon size={22} strokeWidth={2.1} />
            {t(`nav.${key}`)}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
