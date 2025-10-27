import {IBadgeRepository} from "../domain/IBadgeRepository";
import {Badge, CreateBadgeData} from "../domain/Badge";

export interface CreateBadgeInput {
  name: string;
  description: string;
  iconUrl?: string;
  color?: string;
  priority: number;
  isActive: boolean;
  createdBy: string; // Moderator's userId
}

export class CreateBadgeUseCase {
  constructor(private badgeRepository: IBadgeRepository) {}

  async execute(input: CreateBadgeInput): Promise<Badge> {
    const data: CreateBadgeData = {
      name: input.name,
      description: input.description,
      iconUrl: input.iconUrl,
      color: input.color,
      priority: input.priority,
      isActive: input.isActive,
      createdBy: input.createdBy,
    };

    return await this.badgeRepository.createBadge(data);
  }
}
