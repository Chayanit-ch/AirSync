import { Bell, Home, Map, PlusCircle, User } from "lucide-react";

/** Shared between `BottomNav` (mobile) and `Sidebar` (desktop, `lg:` and up) so the two navs can never drift apart. */
export const NAV_ITEMS = [
  { to: "/", key: "home", icon: Home, end: true },
  { to: "/map", key: "map", icon: Map, end: false },
  { to: "/report", key: "report", icon: PlusCircle, end: false },
  { to: "/alerts", key: "alerts", icon: Bell, end: false },
  { to: "/profile", key: "profile", icon: User, end: false },
] as const;
