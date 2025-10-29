import {VisibilityLevel} from "../domain/Card";

/**
 * Default visibility rules for card fields
 */
export const DEFAULT_VISIBILITY: Record<string, VisibilityLevel> = {
  // Basic profile: public by default
  displayName: "public",
  photoURL: "public",
  bio: "public",
  backgroundImageUrl: "public",

  // Contact: private by default
  email: "private",
  phoneNumber: "private",
  line: "private",
  discord: "private",
  telegram: "private",
  slack: "private",
  otherContacts: "private",

  // Social Media: public by default
  github: "public",
  x: "public",
  linkedin: "public",
  instagram: "public",
  facebook: "public",
  zenn: "public",
  qiita: "public",
  website: "public",
  blog: "public",
  youtube: "public",
  twitch: "public",

  // Other
  badges: "public",
};

/**
 * Get visibility level for a field (use default if not specified)
 */
export function getVisibility(
  fieldName: string,
  userVisibility?: Partial<Record<string, VisibilityLevel>>
): VisibilityLevel {
  return userVisibility?.[fieldName] ?? DEFAULT_VISIBILITY[fieldName] ?? "hidden";
}
