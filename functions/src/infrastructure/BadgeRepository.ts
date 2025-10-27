import {Firestore} from "firebase-admin/firestore";
import {Badge, CreateBadgeData} from "../domain/Badge";
import {UserBadge, GrantBadgeData} from "../domain/UserBadge";
import {IBadgeRepository} from "../domain/IBadgeRepository";

export class BadgeRepository implements IBadgeRepository {
  constructor(private firestore: Firestore) {}

  /**
   * Create a new badge
   */
  async createBadge(data: CreateBadgeData): Promise<Badge> {
    const now = new Date();
    const badgeId = this.firestore.collection("_").doc().id; // Generate random ID

    const badge: Badge = {
      badgeId,
      name: data.name,
      description: data.description,
      iconUrl: data.iconUrl,
      color: data.color,
      priority: data.priority,
      isActive: data.isActive,
      createdAt: now,
      createdBy: data.createdBy,
    };

    await this.firestore
      .collection("badges")
      .doc(badgeId)
      .set({
        badgeId,
        name: badge.name,
        description: badge.description,
        iconUrl: badge.iconUrl || null,
        color: badge.color || null,
        priority: badge.priority,
        isActive: badge.isActive,
        createdAt: now,
        createdBy: badge.createdBy,
      });

    return badge;
  }

  /**
   * Find a badge by ID
   */
  async findBadgeById(badgeId: string): Promise<Badge | null> {
    const doc = await this.firestore.collection("badges").doc(badgeId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data()!;
    return {
      badgeId: data.badgeId,
      name: data.name,
      description: data.description,
      iconUrl: data.iconUrl || undefined,
      color: data.color || undefined,
      priority: data.priority,
      isActive: data.isActive,
      createdAt: data.createdAt.toDate(),
      createdBy: data.createdBy,
    };
  }

  /**
   * List all active badges
   */
  async listActiveBadges(): Promise<Badge[]> {
    const snapshot = await this.firestore
      .collection("badges")
      .where("isActive", "==", true)
      .orderBy("priority", "asc")
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        badgeId: data.badgeId,
        name: data.name,
        description: data.description,
        iconUrl: data.iconUrl || undefined,
        color: data.color || undefined,
        priority: data.priority,
        isActive: data.isActive,
        createdAt: data.createdAt.toDate(),
        createdBy: data.createdBy,
      };
    });
  }

  /**
   * Grant a badge to a user
   */
  async grantBadge(data: GrantBadgeData): Promise<UserBadge> {
    const now = new Date();

    const userBadge: UserBadge = {
      badgeId: data.badgeId,
      grantedAt: now,
      grantedBy: data.grantedBy,
      reason: data.reason,
      visibility: {
        showOnPublicCard: true,
        showOnPrivateCard: true,
      },
    };

    await this.firestore
      .collection("users")
      .doc(data.userId)
      .collection("badges")
      .doc(data.badgeId)
      .set({
        badgeId: userBadge.badgeId,
        grantedAt: now,
        grantedBy: userBadge.grantedBy,
        reason: userBadge.reason || null,
        visibility: userBadge.visibility,
      });

    return userBadge;
  }

  /**
   * Revoke a badge from a user
   */
  async revokeBadge(userId: string, badgeId: string): Promise<void> {
    await this.firestore.collection("users").doc(userId).collection("badges").doc(badgeId).delete();
  }

  /**
   * Find a user's badge
   */
  async findUserBadge(userId: string, badgeId: string): Promise<UserBadge | null> {
    const doc = await this.firestore
      .collection("users")
      .doc(userId)
      .collection("badges")
      .doc(badgeId)
      .get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data()!;
    return {
      badgeId: data.badgeId,
      grantedAt: data.grantedAt.toDate(),
      grantedBy: data.grantedBy,
      reason: data.reason || undefined,
      visibility: data.visibility,
    };
  }

  /**
   * Check if a user already has a badge
   */
  async hasUserBadge(userId: string, badgeId: string): Promise<boolean> {
    const doc = await this.firestore
      .collection("users")
      .doc(userId)
      .collection("badges")
      .doc(badgeId)
      .get();

    return doc.exists;
  }

  /**
   * Find all badges for a user
   */
  async findUserBadges(userId: string): Promise<UserBadge[]> {
    const snapshot = await this.firestore
      .collection("users")
      .doc(userId)
      .collection("badges")
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        badgeId: data.badgeId,
        grantedAt: data.grantedAt.toDate(),
        grantedBy: data.grantedBy,
        reason: data.reason || undefined,
        visibility: data.visibility,
      };
    });
  }

  /**
   * Update badge visibility for a user
   */
  async updateVisibility(
    userId: string,
    badgeId: string,
    visibility: {showOnPublicCard: boolean; showOnPrivateCard: boolean}
  ): Promise<void> {
    await this.firestore.collection("users").doc(userId).collection("badges").doc(badgeId).update({
      visibility,
    });
  }

  /**
   * Get badge IDs that should be shown on public card
   */
  async getBadgeIdsForPublicCard(userId: string): Promise<string[]> {
    const snapshot = await this.firestore
      .collection("users")
      .doc(userId)
      .collection("badges")
      .where("visibility.showOnPublicCard", "==", true)
      .get();

    return snapshot.docs.map((doc) => doc.data().badgeId);
  }

  /**
   * Get badge IDs that should be shown on private card
   */
  async getBadgeIdsForPrivateCard(userId: string): Promise<string[]> {
    const snapshot = await this.firestore
      .collection("users")
      .doc(userId)
      .collection("badges")
      .where("visibility.showOnPrivateCard", "==", true)
      .get();

    return snapshot.docs.map((doc) => doc.data().badgeId);
  }
}
