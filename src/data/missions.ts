import type { Mission } from "../types";

/**
 * Static mission catalog — intentionally not stored in Firestore (see the
 * project spec: "Do not store missions in Firestore"). Titles/descriptions
 * are resolved through `t(titleKey)`/`t(descriptionKey)`, never hard-coded
 * strings, so both languages stay in sync automatically.
 *
 * "Share air-quality information with others" is omitted: there's no real
 * sharing feature in the app yet to honestly award points for.
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

/** Missions shown with a manual "mark complete" control in the Today's Missions UI. */
export const HONOR_SYSTEM_MISSIONS = MISSIONS.filter((m) => !m.auto);
