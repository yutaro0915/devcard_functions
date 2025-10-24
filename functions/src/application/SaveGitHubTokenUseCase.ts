import {IUserRepository} from "../domain/IUserRepository";

/**
 * Input data for saving GitHub token
 */
export interface SaveGitHubTokenInput {
  userId: string;
  accessToken: string;
}

/**
 * Use case for saving GitHub OAuth access token
 */
export class SaveGitHubTokenUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(input: SaveGitHubTokenInput): Promise<void> {
    // Verify user exists
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new Error(`User ${input.userId} not found`);
    }

    // Save GitHub access token
    await this.userRepository.update(input.userId, {
      githubAccessToken: input.accessToken,
    });
  }
}
