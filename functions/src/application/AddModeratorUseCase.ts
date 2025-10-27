import {IModeratorRepository} from "../domain/IModeratorRepository";
import {IUserRepository} from "../domain/IUserRepository";
import {AddModeratorData, Moderator} from "../domain/Moderator";
import {UserNotFoundError} from "../domain/errors/DomainErrors";

export interface AddModeratorInput {
  userId: string;
  role: "admin" | "moderator";
  permissions: string[];
}

export class AddModeratorUseCase {
  constructor(
    private moderatorRepository: IModeratorRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(input: AddModeratorInput): Promise<Moderator> {
    // Verify user exists
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    const data: AddModeratorData = {
      userId: input.userId,
      role: input.role,
      permissions: input.permissions,
    };

    return await this.moderatorRepository.addModerator(data);
  }
}
