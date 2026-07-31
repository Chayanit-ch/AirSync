/**
 * Cross-page guided tour spanning Home, Map, Report, Alerts, and Profile.
 * Every `targetId` here must match a `data-tour-id` attribute on some
 * element actually rendered on `page` — see `TourOverlay`'s lookup, which
 * polls (rather than measuring once) so a step whose `page` differs from the
 * current route has time to navigate and render before it gives up.
 *
 * `nav-bar` and `nav-profile` are deliberately shared between `Sidebar.tsx`
 * (desktop) and `BottomNav.tsx` (mobile) — only one is visible at a time
 * depending on viewport, and `TourOverlay` picks whichever one actually has
 * layout (see `findVisibleTourTarget`).
 *
 * `extra-resources`' mobile equivalent lives inside `MobileNavDrawer`, which
 * is normally off-screen via a translate transform (not `display:none`), so
 * unlike `nav-bar`/`nav-profile` there's no breakpoint-driven visibility
 * toggle for `findVisibleTourTarget` to rely on — the drawer has to actually
 * be open for its target to have real on-screen layout. `opensMobileDrawer`
 * marks this step for `PageLayout`, which forces the drawer open while it's
 * active and closes it again once the tour moves past it.
 *
 * The original 5 steps (hero/map/report/nav/profile) are kept, in their
 * original order and content, as required — everything else was appended
 * around them or after them.
 */
export interface TourStep {
  id: string;
  targetId: string;
  titleKey: string;
  bodyKey: string;
  /** Preferred side to place the tooltip relative to the spotlighted element. */
  placement: "top" | "bottom";
  /** Route this step's target lives on. `PageLayout` navigates here (if not already there) whenever this becomes the active step. */
  page: string;
  /** True only for the one step whose mobile target lives inside `MobileNavDrawer` — see the header comment above. */
  opensMobileDrawer?: boolean;
}

export const TOUR_STEPS: TourStep[] = [
  // --- Home ---
  {
    id: "hero",
    targetId: "onboarding-hero",
    titleKey: "onboarding.steps.hero.title",
    bodyKey: "onboarding.steps.hero.body",
    placement: "bottom",
    page: "/",
  },
  {
    id: "ai-advice",
    targetId: "onboarding-ai-advice",
    titleKey: "onboarding.steps.aiAdvice.title",
    bodyKey: "onboarding.steps.aiAdvice.body",
    placement: "bottom",
    page: "/",
  },
  {
    id: "map",
    targetId: "onboarding-map-action",
    titleKey: "onboarding.steps.map.title",
    bodyKey: "onboarding.steps.map.body",
    placement: "bottom",
    page: "/",
  },
  {
    id: "report",
    targetId: "onboarding-report-action",
    titleKey: "onboarding.steps.report.title",
    bodyKey: "onboarding.steps.report.body",
    placement: "bottom",
    page: "/",
  },
  {
    id: "leaderboard-action",
    targetId: "onboarding-leaderboard-action",
    titleKey: "onboarding.steps.leaderboardAction.title",
    bodyKey: "onboarding.steps.leaderboardAction.body",
    placement: "bottom",
    page: "/",
  },
  {
    id: "followed-areas",
    targetId: "onboarding-followed-areas",
    titleKey: "onboarding.steps.followedAreas.title",
    bodyKey: "onboarding.steps.followedAreas.body",
    placement: "bottom",
    page: "/",
  },
  {
    id: "nav",
    targetId: "onboarding-nav-bar",
    titleKey: "onboarding.steps.nav.title",
    bodyKey: "onboarding.steps.nav.body",
    placement: "top",
    page: "/",
  },
  {
    id: "profile",
    targetId: "onboarding-nav-profile",
    titleKey: "onboarding.steps.profile.title",
    bodyKey: "onboarding.steps.profile.body",
    placement: "top",
    page: "/",
  },
  {
    id: "extra-resources",
    targetId: "onboarding-extra-resources",
    titleKey: "onboarding.steps.extraResources.title",
    bodyKey: "onboarding.steps.extraResources.body",
    placement: "top",
    page: "/",
    opensMobileDrawer: true,
  },
  // --- Map ---
  {
    id: "map-tools",
    targetId: "onboarding-map-tools",
    titleKey: "onboarding.steps.mapTools.title",
    bodyKey: "onboarding.steps.mapTools.body",
    placement: "bottom",
    page: "/map",
  },
  {
    id: "map-station-trend",
    targetId: "onboarding-station-trend",
    titleKey: "onboarding.steps.mapStationTrend.title",
    bodyKey: "onboarding.steps.mapStationTrend.body",
    placement: "top",
    page: "/map",
  },
  // --- Report ---
  {
    id: "report-form",
    targetId: "onboarding-report-form",
    titleKey: "onboarding.steps.reportForm.title",
    bodyKey: "onboarding.steps.reportForm.body",
    placement: "bottom",
    page: "/report",
  },
  {
    id: "report-history",
    targetId: "onboarding-report-history",
    titleKey: "onboarding.steps.reportHistory.title",
    bodyKey: "onboarding.steps.reportHistory.body",
    placement: "top",
    page: "/report",
  },
  // --- Alerts ---
  {
    id: "alerts-filters",
    targetId: "onboarding-alerts-filters",
    titleKey: "onboarding.steps.alertsFilters.title",
    bodyKey: "onboarding.steps.alertsFilters.body",
    placement: "bottom",
    page: "/alerts",
  },
  {
    id: "alerts-content",
    targetId: "onboarding-alerts-content",
    titleKey: "onboarding.steps.alertsContent.title",
    bodyKey: "onboarding.steps.alertsContent.body",
    placement: "bottom",
    page: "/alerts",
  },
  // --- Profile (highest priority — most comprehensive coverage) ---
  {
    id: "profile-identity",
    targetId: "onboarding-profile-identity",
    titleKey: "onboarding.steps.profileIdentity.title",
    bodyKey: "onboarding.steps.profileIdentity.body",
    placement: "bottom",
    page: "/profile",
  },
  {
    id: "profile-missions",
    targetId: "onboarding-profile-missions",
    titleKey: "onboarding.steps.profileMissions.title",
    bodyKey: "onboarding.steps.profileMissions.body",
    placement: "bottom",
    page: "/profile",
  },
  {
    id: "profile-settings",
    targetId: "onboarding-profile-settings",
    titleKey: "onboarding.steps.profileSettings.title",
    bodyKey: "onboarding.steps.profileSettings.body",
    placement: "top",
    page: "/profile",
  },
  {
    id: "profile-language",
    targetId: "onboarding-language-switch",
    titleKey: "onboarding.steps.profileLanguage.title",
    bodyKey: "onboarding.steps.profileLanguage.body",
    placement: "bottom",
    page: "/profile",
  },
];
