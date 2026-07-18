import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { ProfileSetupErrorBanner } from "../shared/ProfileSetupErrorBanner";

export function PageLayout() {
  return (
    <>
      <TopBar />
      <ProfileSetupErrorBanner />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}
