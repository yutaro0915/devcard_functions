import {IBadgeRepository} from "../domain/IBadgeRepository";
import {UserBadge} from "../domain/UserBadge";

export interface GetUserBadgesInput {
  userId: string;
}

export interface GetUserBadgesOutput {
  badges: UserBadge[];
}

export class GetUserBadgesUseCase {
  constructor(private badgeRepository: IBadgeRepository) {}

  async execute(input: GetUserBadgesInput): Promise<GetUserBadgesOutput> {
    const badges = await this.badgeRepository.findUserBadges(input.userId);

    return {
      badges,
    };
  }
}
