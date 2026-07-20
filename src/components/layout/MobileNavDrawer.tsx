import { Info, LogIn, LogOut, Mail, Wind, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { logOut } from "../../services/auth";
import { UserAvatar } from "../common/UserAvatar";
import { VisuallyHidden } from "../shared/VisuallyHidden";

const FEEDBACK_EMAIL = "baitoey8344@gmail.com";

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Mobile-only (`lg:hidden` regardless of `open`, so it can never appear
 * alongside the desktop sidebar) navigation drawer opened by `TopBar`'s
 * hamburger button — separate from the 5 primary nav items already in
 * `BottomNav`, this holds the auxiliary items a bottom nav doesn't have
 * room for (About, contact, sign out/in).
 */
export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const { currentUser, isLoggingOutRef } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  async function handleLogout() {
    onClose();
    isLoggingOutRef.current = true;
    await logOut().catch(() => {});
    navigate("/", { replace: true });
    setTimeout(() => {
      isLoggingOutRef.current = false;
    }, 0);
  }

  function goTo(path: string) {
    onClose();
    navigate(path);
  }

  return (
    <div
      className={`fixed inset-0 z-1000 lg:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Backdrop — closes the drawer on tap. */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-nav-drawer-title"
        className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* The visible "AirSync" brand mark below isn't a description of
            this dialog's purpose, so the accessible name is a separate
            hidden heading instead of reusing it. */}
        <VisuallyHidden as="h2" id="mobile-nav-drawer-title">
          {t("drawer.title")}
        </VisuallyHidden>
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <Wind size={22} className="text-brand-600" strokeWidth={2.5} />
            <span className="text-brand-700 text-lg font-bold tracking-tight">AirSync</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50"
          >
            <X size={20} />
          </button>
        </div>

        {currentUser && (
          <div className="flex items-center gap-3 border-b border-gray-100 p-4">
            <UserAvatar photoURL={currentUser.photoURL} displayName={currentUser.displayName} size="md" />
            <div className="min-w-0">
              <p className="truncate font-bold text-gray-900">{currentUser.displayName}</p>
              <p className="truncate text-xs text-gray-400">{currentUser.email}</p>
            </div>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1 p-2">
          <button
            type="button"
            onClick={() => goTo("/about")}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Info size={18} className="text-gray-400" />
            {t("drawer.about")}
          </button>
          <a
            href={`mailto:${FEEDBACK_EMAIL}`}
            onClick={onClose}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Mail size={18} className="text-gray-400" />
            {t("drawer.contact")}
          </a>
        </nav>

        <div className="border-t border-gray-100 p-2">
          {currentUser ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <LogOut size={18} />
              {t("common.logout")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goTo("/login")}
              className="text-brand-600 hover:bg-brand-50 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold"
            >
              <LogIn size={18} />
              {t("common.login")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
