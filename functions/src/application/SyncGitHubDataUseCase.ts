import {IUserRepository} from "../domain/IUserRepository";
import {IPublicCardRepository} from "../domain/IPublicCardRepository";
import {IGitHubService} from "../domain/IGitHubService";
import {ConnectedService} from "../domain/PublicCard";

/**
 * Use case for syncing GitHub data to public card
 */
export class SyncGitHubDataUseCase {
  constructor(
    private userRepository: IUserRepository,
    private publicCardRepository: IPublicCardRepository,
    private gitHubService: IGitHubService
  ) {}

  async execute(userId: string): Promise<void> {
    // Get user with GitHub access token
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    if (!user.githubAccessToken) {
      throw new Error("GitHub access token not found for user");
    }

    // Fetch GitHub profile
    const profile = await this.gitHubService.getUserProfile(user.githubAccessToken);

    // Build ConnectedService data for GitHub
    const githubService: ConnectedService = {
      serviceName: "github",
      username: profile.login,
      profileUrl: `https://github.com/${profile.login}`,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio || undefined,
      stats: {
        publicRepos: profile.publicRepos,
        followers: profile.followers,
        following: profile.following,
      },
    };

    // Get existing public card
    const publicCard = await this.publicCardRepository.findByUserId(userId);
    if (!publicCard) {
      throw new Error(`PublicCard for user ${userId} not found`);
    }

    // Update public card with GitHub data
    await this.publicCardRepository.update(userId, {
      connectedServices: {
        ...publicCard.connectedServices,
        github: githubService,
      },
    });
  }
}
