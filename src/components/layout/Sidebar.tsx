import { ChevronLeft, ChevronRight, Wind } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "../../hooks/useTranslation";
import { NAV_ITEMS } from "./navItems";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/**
 * Desktop-only (`lg:` and up) left navigation, replacing `BottomNav` on wide
 * screens — same `NAV_ITEMS` so the two can never list different pages.
 * Collapse state is owned by `PageLayout` (persisted via `localStorage`
 * there) rather than locally, so `TopBar`'s hamburger button can drive the
 * same state instead of only this sidebar's own footer button being able to.
 */
export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside
      className={`hidden shrink-0 flex-col border-r border-gray-100 bg-white transition-[width] duration-150 lg:flex ${
        collapsed ? "w-18" : "w-56"
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b border-gray-100 px-4 py-4 ${
          collapsed ? "justify-center px-2" : ""
        }`}
      >
        <Wind size={24} className="text-brand-600 shrink-0" strokeWidth={2.5} />
        {!collapsed && (
          <span className="text-brand-700 truncate text-lg font-bold tracking-tight">
            AirSync
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2">
        {NAV_ITEMS.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? t(`nav.${key}`) : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-brand-50 text-brand-700" : "text-gray-500 hover:bg-gray-50"
              } ${collapsed ? "justify-center px-0" : ""}`
            }
          >
            <Icon size={20} strokeWidth={2.1} className="shrink-0" />
            {!collapsed && <span className="truncate">{t(`nav.${key}`)}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? t("common.expandSidebar") : t("common.collapseSidebar")}
        className={`flex items-center gap-2 border-t border-gray-100 px-3 py-3 text-sm text-gray-500 hover:bg-gray-50 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        {!collapsed && <span>{t("common.collapseSidebar")}</span>}
      </button>
    </aside>
  );
}
