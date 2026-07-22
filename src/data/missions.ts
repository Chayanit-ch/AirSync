import type { Mission } from "../types";

/**
 * Static mission catalog — intentionally not stored in Firestore (see the
 * project spec: "Do not store missions in Firestore"). Titles/descriptions
 * are resolved through `t(titleKey)`/`t(descriptionKey)`, never hard-coded
 * strings, so both languages stay in sync automatically.
 *
 * "Share air-quality information with others" (the general public-facing
 * version) is omitted: there's no real sharing feature in the app yet to
 * honestly award points for. "share-with-family" below is different — it's
 * an honor-system habit-reminder (tell people you already know), not a
 * claim about an in-app share feature that doesn't exist.
 *
 * Only `HONOR_SYSTEM_MISSIONS` (the non-`auto` ones) are eligible for the
 * daily 5-of-N rotation — see `getTodaysMissions` in
 * `src/utils/missionRotation.ts`. `report-pollution` and `set-risk-group`
 * are system-awarded and always active regardless of that day's rotation,
 * since gating an automatic reward behind "is this mission featured today"
 * would make the auto-award feel broken/inconsistent.
 */
export const MISSIONS: Mission[] = [
  {
    id: "check-air-quality",
    titleKey: "missions.checkAirQuality.title",
    descriptionKey: "missions.checkAirQuality.description",
    points: 5,
    icon: "Wind",
    frequency: "daily",
  },
  {
    id: "wear-mask",
    titleKey: "missions.wearMask.title",
    descriptionKey: "missions.wearMask.description",
    points: 10,
    icon: "ShieldCheck",
    frequency: "daily",
  },
  {
    id: "use-public-transit",
    titleKey: "missions.usePublicTransit.title",
    descriptionKey: "missions.usePublicTransit.description",
    points: 10,
    icon: "MapPin",
    frequency: "daily",
  },
  {
    id: "water-plants",
    titleKey: "missions.waterPlants.title",
    descriptionKey: "missions.waterPlants.description",
    points: 10,
    icon: "TreePine",
    frequency: "daily",
  },
  {
    id: "avoid-burning",
    titleKey: "missions.avoidBurning.title",
    descriptionKey: "missions.avoidBurning.description",
    points: 10,
    icon: "Flame",
    frequency: "daily",
  },
  {
    id: "check-air-before-leaving",
    titleKey: "missions.checkAirBeforeLeaving.title",
    descriptionKey: "missions.checkAirBeforeLeaving.description",
    points: 5,
    icon: "Eye",
    frequency: "daily",
  },
  {
    id: "share-with-family",
    titleKey: "missions.shareWithFamily.title",
    descriptionKey: "missions.shareWithFamily.description",
    points: 5,
    icon: "Share2",
    frequency: "daily",
  },
  {
    id: "close-windows",
    titleKey: "missions.closeWindows.title",
    descriptionKey: "missions.closeWindows.description",
    points: 5,
    icon: "DoorClosed",
    frequency: "daily",
  },
  {
    id: "care-for-plants",
    titleKey: "missions.careForPlants.title",
    descriptionKey: "missions.careForPlants.description",
    points: 10,
    icon: "Sprout",
    frequency: "daily",
  },
  {
    id: "walk-or-cycle",
    titleKey: "missions.walkOrCycle.title",
    descriptionKey: "missions.walkOrCycle.description",
    points: 10,
    icon: "Bike",
    frequency: "daily",
  },
  {
    id: "check-air-purifier",
    titleKey: "missions.checkAirPurifier.title",
    descriptionKey: "missions.checkAirPurifier.description",
    points: 5,
    icon: "AirVent",
    frequency: "daily",
  },
  {
    id: "avoid-idling",
    titleKey: "missions.avoidIdling.title",
    descriptionKey: "missions.avoidIdling.description",
    points: 5,
    icon: "Car",
    frequency: "daily",
  },
  {
    id: "carpool",
    titleKey: "missions.carpool.title",
    descriptionKey: "missions.carpool.description",
    points: 10,
    icon: "Users",
    frequency: "daily",
  },
  {
    id: "limit-outdoor-exercise",
    titleKey: "missions.limitOutdoorExercise.title",
    descriptionKey: "missions.limitOutdoorExercise.description",
    points: 5,
    icon: "HeartPulse",
    frequency: "daily",
  },
  {
    id: "recycle-instead-of-burning",
    titleKey: "missions.recycleInsteadOfBurning.title",
    descriptionKey: "missions.recycleInsteadOfBurning.description",
    points: 10,
    icon: "Recycle",
    frequency: "daily",
  },
  {
    id: "report-pollution",
    titleKey: "missions.reportPollution.title",
    descriptionKey: "missions.reportPollution.description",
    points: 15,
    icon: "Megaphone",
    frequency: "daily",
    auto: true,
  },
  {
    id: "set-risk-group",
    titleKey: "missions.setRiskGroup.title",
    descriptionKey: "missions.setRiskGroup.description",
    points: 5,
    icon: "Leaf",
    frequency: "once",
    auto: true,
  },
];

export const REPORT_POLLUTION_MISSION = MISSIONS.find((m) => m.id === "report-pollution")!;
export const SET_RISK_GROUP_MISSION = MISSIONS.find((m) => m.id === "set-risk-group")!;

/** The rotating pool: daily missions the user marks complete themselves — excludes the two system-awarded `auto` ones above. */
export const HONOR_SYSTEM_MISSIONS = MISSIONS.filter((m) => !m.auto);
