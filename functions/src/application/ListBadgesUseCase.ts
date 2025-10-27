import {IBadgeRepository} from "../domain/IBadgeRepository";
import {Badge} from "../domain/Badge";

export class ListBadgesUseCase {
  constructor(private badgeRepository: IBadgeRepository) {}

  async execute(): Promise<Badge[]> {
    return await this.badgeRepository.listActiveBadges();
  }
}
