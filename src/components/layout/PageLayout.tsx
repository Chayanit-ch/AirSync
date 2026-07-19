import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { ProfileSetupErrorBanner } from "../shared/ProfileSetupErrorBanner";

/**
 * The "mobile phone frame" (max-width, centered, drop shadow) used to be
 * hard-coded on `#root` in index.css — now it's this Tailwind-responsive
 * wrapper, so `lg:` and up can drop the max-width and lay the sidebar out
 * next to the content instead of only ever being phone-width. Mobile
 * (`<lg`) is pixel-identical to before: same max-width, same stack order.
 */
export function PageLayout() {
  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col overflow-hidden bg-gray-100 shadow-[0_0_0_1px_rgba(0,0,0,0.04)] lg:max-w-none lg:flex-row lg:shadow-none">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <ProfileSetupErrorBanner />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
