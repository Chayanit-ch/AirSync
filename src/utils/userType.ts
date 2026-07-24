import type { UserProfile, UserType } from "../types";

/** Profiles created before `userType` shipped don't have it — treat missing as `"citizen"`. Every place that reads `userType` for display should call this rather than reading the field directly. */
export function getUserType(profile: Pick<UserProfile, "userType"> | null | undefined): UserType {
  return profile?.userType ?? "citizen";
}
