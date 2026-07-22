import { Bell, LogOut, User as UserIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { currentUser as mockUser } from "../../data/mockData";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { logOut } from "../../services/auth";
import { getLevelFromPoints, getProgressInCurrentLevel } from "../../utils/gamification";
import { UserAvatar } from "../common/UserAvatar";
import { LevelProgressBar } from "../profile/LevelProgressBar";

export function ProfileDropdown() {
  const { currentUser, userProfile, isLoggingOutRef } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (!currentUser) {
    return (
      <Link
        to="/login"
        className="bg-brand-600 hover:bg-brand-700 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-colors"
      >
        {t("common.login")}
      </Link>
    );
  }

  const displayName = currentUser.displayName || mockUser.displayName;
  const email = currentUser.email || mockUser.email;
  const points = userProfile?.points ?? mockUser.points;
  const role = userProfile?.role ?? mockUser.role;
  const isOrg = role === "authority" || role === "admin";
  const level = getLevelFromPoints(points);
  const progress = getProgressInCurrentLevel(points);

  function goTo(path: string) {
    setIsOpen(false);
    navigate(path);
  }

  async function handleLogout() {
    setIsOpen(false);
    isLoggingOutRef.current = true;
    await logOut().catch(() => {});
    navigate("/", { replace: true });
    // Deferred so React can flush the pending re-render (which needs to see
    // isLoggingOutRef as true) before it's reset — see ProfilePage's own
    // handleLogout for the full explanation.
    setTimeout(() => {
      isLoggingOutRef.current = false;
    }, 0);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t("profile.userMenu")}
        className="block rounded-full"
      >
        <UserAvatar photoURL={currentUser.photoURL} displayName={displayName} size="sm" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="animate-dropdown-in absolute top-full right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] origin-top-right rounded-2xl border border-gray-100 bg-white shadow-lg"
        >
          <div className="flex items-center gap-3 p-4">
            <UserAvatar photoURL={currentUser.photoURL} displayName={displayName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-gray-900">{displayName}</p>
              <p className="truncate text-xs text-gray-400">{email}</p>
              <p
                className={`mt-1 truncate text-xs font-semibold ${isOrg ? "text-amber-600" : "text-brand-600"}`}
              >
                {isOrg
                  ? t("profile.airProtectionOrgLevel", { level })
                  : t("profile.guardianLevel", { level })}
              </p>
              <div className="mt-1.5">
                <LevelProgressBar progress={progress} size="sm" />
                <p className="mt-1 text-[11px] text-gray-400">
                  {t("profile.levelProgressShort", { current: progress })}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          <div className="p-1.5">
            <button
              type="button"
              onClick={() => goTo("/profile")}
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <UserIcon size={17} />
              {t("profile.myProfile")}
            </button>
            <button
              type="button"
              onClick={() => goTo("/profile")}
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Bell size={17} />
              {t("profile.notificationSettings")}
            </button>
          </div>

          <div className="border-t border-gray-100" />

          <div className="p-1.5">
            <button
              type="button"
              onClick={handleLogout}
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <LogOut size={17} />
              {t("common.logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
