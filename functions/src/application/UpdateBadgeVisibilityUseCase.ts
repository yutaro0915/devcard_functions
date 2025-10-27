import {IBadgeRepository} from "../domain/IBadgeRepository";
import {BadgeNotFoundError} from "../domain/errors/DomainErrors";

export interface UpdateBadgeVisibilityInput {
  userId: string;
  badgeId: string;
  showOnPublicCard: boolean;
  showOnPrivateCard: boolean;
}

export class UpdateBadgeVisibilityUseCase {
  constructor(private badgeRepository: IBadgeRepository) {}

  async execute(input: UpdateBadgeVisibilityInput): Promise<void> {
    // Verify the user has this badge
    const userBadge = await this.badgeRepository.findUserBadge(input.userId, input.badgeId);
    if (!userBadge) {
      throw new BadgeNotFoundError(input.badgeId);
    }

    // Update visibility
    await this.badgeRepository.updateVisibility(input.userId, input.badgeId, {
      showOnPublicCard: input.showOnPublicCard,
      showOnPrivateCard: input.showOnPrivateCard,
    });
  }
}
