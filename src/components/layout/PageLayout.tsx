import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { MobileNavDrawer } from "./MobileNavDrawer";
import { ProfileSetupErrorBanner } from "../shared/ProfileSetupErrorBanner";
import { TourOverlay } from "../onboarding/TourOverlay";
import { useOnboardingTour } from "../../contexts/OnboardingTourContext";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "airsync-sidebar-collapsed";

function readStoredCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
}

/**
 * The "mobile phone frame" (max-width, centered, drop shadow) used to be
 * hard-coded on `#root` in index.css — now it's this Tailwind-responsive
 * wrapper, so `lg:` and up can drop the max-width and lay the sidebar out
 * next to the content instead of only ever being phone-width. Mobile
 * (`<lg`) is pixel-identical to before: same max-width, same stack order.
 *
 * Owns the sidebar-collapsed state (persisted here, not inside `Sidebar`
 * itself) and the mobile-drawer-open state, so `TopBar`'s single hamburger
 * button can drive both — which one is visible depends entirely on which
 * breakpoint's CSS is active (`Sidebar` is `hidden` below `lg:`, the drawer
 * is `lg:hidden`), no JS breakpoint detection needed.
 */
export function PageLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readStoredCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isActive: isTourActive } = useOnboardingTour();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Every tour step targets a Home-page element (see `tourSteps.ts`) — but
  // the auto-start trigger (`OnboardingTourContext`) fires as soon as the
  // profile loads, regardless of which page that happens to be (e.g. a
  // fresh signup can land on /profile). Redirect to Home whenever the tour
  // becomes active from elsewhere, so its spotlight always has a real
  // target instead of falling back to an un-anchored centered tooltip.
  useEffect(() => {
    if (isTourActive && location.pathname !== "/") {
      navigate("/", { replace: true });
    }
  }, [isTourActive, location.pathname, navigate]);

  function handleMenuButtonClick() {
    setSidebarCollapsed((prev) => !prev);
    setDrawerOpen(true);
  }

  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col overflow-hidden bg-gray-100 shadow-[0_0_0_1px_rgba(0,0,0,0.04)] lg:max-w-none lg:flex-row lg:shadow-none">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
      />
      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onMenuButtonClick={handleMenuButtonClick} />
        <ProfileSetupErrorBanner />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
        <BottomNav />
      </div>
      <TourOverlay />
    </div>
  );
}
