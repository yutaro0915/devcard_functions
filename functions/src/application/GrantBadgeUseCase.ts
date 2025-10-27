import {IBadgeRepository} from "../domain/IBadgeRepository";
import {IUserRepository} from "../domain/IUserRepository";
import {UserBadge, GrantBadgeData} from "../domain/UserBadge";
import {
  BadgeNotFoundError,
  UserNotFoundError,
  BadgeAlreadyGrantedError,
} from "../domain/errors/DomainErrors";

export interface GrantBadgeInput {
  badgeId: string;
  targetUserId: string;
  grantedBy: string; // Moderator's userId
  reason?: string;
}

export class GrantBadgeUseCase {
  constructor(
    private badgeRepository: IBadgeRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(input: GrantBadgeInput): Promise<UserBadge> {
    // Verify badge exists
    const badge = await this.badgeRepository.findBadgeById(input.badgeId);
    if (!badge) {
      throw new BadgeNotFoundError(input.badgeId);
    }

    // Verify target user exists
    const user = await this.userRepository.findById(input.targetUserId);
    if (!user) {
      throw new UserNotFoundError(input.targetUserId);
    }

    // Check if badge is already granted
    const alreadyGranted = await this.badgeRepository.hasUserBadge(
      input.targetUserId,
      input.badgeId
    );
    if (alreadyGranted) {
      throw new BadgeAlreadyGrantedError(input.targetUserId, input.badgeId);
    }

    const data: GrantBadgeData = {
      userId: input.targetUserId,
      badgeId: input.badgeId,
      grantedBy: input.grantedBy,
      reason: input.reason,
    };

    return await this.badgeRepository.grantBadge(data);
  }
}
