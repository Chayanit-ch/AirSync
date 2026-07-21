import { NavLink } from "react-router-dom";
import { useTranslation } from "../../hooks/useTranslation";
import { NAV_ITEMS } from "./navItems";

export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav
      data-tour-id="onboarding-nav-bar"
      className="z-30 shrink-0 border-t border-gray-100 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="flex items-stretch justify-between px-1">
        {NAV_ITEMS.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            data-tour-id={key === "profile" ? "onboarding-nav-profile" : undefined}
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
