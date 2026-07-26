import type { UserProfile, UserType } from "../types";

/** Profiles created before `userType` shipped don't have it — treat missing as `"citizen"`. Every place that reads `userType` for display should call this rather than reading the field directly. */
export function getUserType(profile: Pick<UserProfile, "userType"> | null | undefined): UserType {
  return profile?.userType ?? "citizen";
}

/** Government accounts show the neutral "Pending Verification" treatment until an administrator manually sets `governmentVerificationStatus: "approved"` in the Firestore Console — see the field's doc comment on `UserProfile`. */
export function isPendingGovernmentVerification(
  profile: Pick<UserProfile, "userType" | "governmentVerificationStatus"> | null | undefined,
): boolean {
  return getUserType(profile) === "government" && profile?.governmentVerificationStatus !== "approved";
}
