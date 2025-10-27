import {IBadgeRepository} from "../domain/IBadgeRepository";
import {IUserRepository} from "../domain/IUserRepository";
import {BadgeNotFoundError, UserNotFoundError} from "../domain/errors/DomainErrors";

export interface RevokeBadgeInput {
  badgeId: string;
  targetUserId: string;
}

export class RevokeBadgeUseCase {
  constructor(
    private badgeRepository: IBadgeRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(input: RevokeBadgeInput): Promise<void> {
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

    // Revoke badge (no error if badge was not granted)
    await this.badgeRepository.revokeBadge(input.targetUserId, input.badgeId);
  }
}
