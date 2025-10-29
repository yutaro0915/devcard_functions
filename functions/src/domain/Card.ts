/**
 * Visibility level for card fields
 */
export type VisibilityLevel = "public" | "private" | "hidden";

/**
 * Unified Card - シンプルでフラットな構造
 */
export interface Card {
  userId: string;

  // Basic profile
  displayName: string;
  photoURL?: string;
  bio?: string;
  backgroundImageUrl?: string;

  // Contact information
  email?: string;
  phoneNumber?: string;

  // Social Media
  github?: string;
  x?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;

  // Tech Communities
  zenn?: string;
  qiita?: string;

  // Messaging
  line?: string;
  discord?: string;
  telegram?: string;
  slack?: string;

  // Other
  website?: string;
  blog?: string;
  youtube?: string;
  twitch?: string;
  otherContacts?: string;

  // Display settings
  theme: string;
  customCss?: string;
  badges?: string[];

  // Visibility control (optional, has defaults)
  visibility?: Partial<{
    bio: VisibilityLevel;
    backgroundImageUrl: VisibilityLevel;
    email: VisibilityLevel;
    phoneNumber: VisibilityLevel;
    github: VisibilityLevel;
    x: VisibilityLevel;
    linkedin: VisibilityLevel;
    instagram: VisibilityLevel;
    facebook: VisibilityLevel;
    zenn: VisibilityLevel;
    qiita: VisibilityLevel;
    line: VisibilityLevel;
    discord: VisibilityLevel;
    telegram: VisibilityLevel;
    slack: VisibilityLevel;
    website: VisibilityLevel;
    blog: VisibilityLevel;
    youtube: VisibilityLevel;
    twitch: VisibilityLevel;
    badges: VisibilityLevel;
  }>;

  // Metadata
  updatedAt: Date;
  isDeleted?: boolean;
}

/**
 * Data required to create a new card
 */
export interface CreateCardData {
  userId: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  theme?: string;
}

/**
 * Data for updating a card
 */
export interface UpdateCardData {
  displayName?: string;
  photoURL?: string;
  bio?: string;
  backgroundImageUrl?: string;
  email?: string;
  phoneNumber?: string;
  github?: string;
  x?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  zenn?: string;
  qiita?: string;
  line?: string;
  discord?: string;
  telegram?: string;
  slack?: string;
  website?: string;
  blog?: string;
  youtube?: string;
  twitch?: string;
  otherContacts?: string;
  theme?: string;
  customCss?: string;
  badges?: string[];
  visibility?: Partial<Card["visibility"]>;
}
