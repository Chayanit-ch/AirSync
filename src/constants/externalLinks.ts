import type { UserType } from "../types";

/**
 * Satisfaction survey (Google Form) — citizens get the general-public form,
 * organization and government accounts share the org/agency form. Keyed by
 * `UserType` so callers can pick the right one via `getUserType(userProfile)`
 * without a manual switch.
 */
export const SATISFACTION_SURVEY_URLS: Record<UserType, string> = {
  citizen: "https://forms.gle/PkKnLYNLRb7f7dy66",
  organization: "https://forms.gle/CySx3jThrVYfP3QK7",
  government: "https://forms.gle/CySx3jThrVYfP3QK7",
};

/** User manual (Google Drive) — same document for every role, shown alongside the in-app onboarding tour rather than replacing it. */
export const USER_MANUAL_URL =
  "https://drive.google.com/file/d/1fj1p_a9RD3YX0tPiuwccRA4bUhl8eeYV/view?usp=sharing";
