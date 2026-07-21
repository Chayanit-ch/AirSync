/**
 * Home-page-only guided tour (see plan: multi-page Home→Map→Profile was
 * considered but dropped for cross-route tour-state complexity). Every
 * `targetId` here must match a `data-tour-id` attribute on some element
 * actually rendered on the Home page — see `TourOverlay`'s lookup.
 *
 * `nav-bar` and `nav-profile` are deliberately shared between `Sidebar.tsx`
 * (desktop) and `BottomNav.tsx` (mobile) — only one is visible at a time
 * depending on viewport, and `TourOverlay` picks whichever one actually has
 * layout (see `findVisibleTourTarget`).
 */
export interface TourStep {
  id: string;
  targetId: string;
  titleKey: string;
  bodyKey: string;
  /** Preferred side to place the tooltip relative to the spotlighted element. */
  placement: "top" | "bottom";
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "hero",
    targetId: "onboarding-hero",
    titleKey: "onboarding.steps.hero.title",
    bodyKey: "onboarding.steps.hero.body",
    placement: "bottom",
  },
  {
    id: "map",
    targetId: "onboarding-map-action",
    titleKey: "onboarding.steps.map.title",
    bodyKey: "onboarding.steps.map.body",
    placement: "bottom",
  },
  {
    id: "report",
    targetId: "onboarding-report-action",
    titleKey: "onboarding.steps.report.title",
    bodyKey: "onboarding.steps.report.body",
    placement: "bottom",
  },
  {
    id: "nav",
    targetId: "onboarding-nav-bar",
    titleKey: "onboarding.steps.nav.title",
    bodyKey: "onboarding.steps.nav.body",
    placement: "top",
  },
  {
    id: "profile",
    targetId: "onboarding-nav-profile",
    titleKey: "onboarding.steps.profile.title",
    bodyKey: "onboarding.steps.profile.body",
    placement: "top",
  },
];
