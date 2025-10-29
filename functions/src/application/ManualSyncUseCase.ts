import {IUserRepository} from "../domain/IUserRepository";
import {ICardRepository} from "../domain/ICardRepository";
import {IGitHubService} from "../domain/IGitHubService";
import {ConnectedService} from "../domain/PublicCard";
import {UserNotFoundError} from "../domain/errors/DomainErrors";

/**
 * Input data for manual sync
 */
export interface ManualSyncInput {
  userId: string;
  services: string[]; // e.g., ["github", "qiita", "zenn"]
}

/**
 * Error information for a failed service sync
 */
export interface SyncError {
  service: string;
  error: "token-not-found" | "token-expired" | "api-error";
}

/**
 * Output data for manual sync
 */
export interface ManualSyncOutput {
  success: boolean;
  syncedServices: string[];
  errors?: SyncError[];
}

/**
 * Result of syncing a single service
 */
interface SyncServiceResult {
  success: boolean;
  data?: ConnectedService;
  error?: "token-not-found" | "token-expired" | "api-error";
}

/**
 * Use case for manual synchronization of external services
 * Currently supports GitHub only
 */
export class ManualSyncUseCase {
  constructor(
    private userRepository: IUserRepository,
    private cardRepository: ICardRepository,
    private gitHubService: IGitHubService
  ) {}

  async execute(input: ManualSyncInput): Promise<ManualSyncOutput> {
    // Verify user exists
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    const syncedServices: string[] = [];
    const errors: SyncError[] = [];

    // Get existing card
    const card = await this.cardRepository.findById(input.userId);
    if (!card) {
      throw new Error(`Card not found for user ${input.userId}`);
    }

    // Copy existing connected services to preserve them
    const updatedServices = {...card.connectedServices};

    // Process each requested service
    for (const service of input.services) {
      if (service === "github") {
        const result = await this.syncGitHub(user.githubAccessToken);
        if (result.success && result.data) {
          updatedServices.github = result.data;
          syncedServices.push("github");
        } else if (result.error) {
          errors.push({
            service: "github",
            error: result.error,
          });
        }
      }
      // Future: Add support for other services (qiita, zenn, etc.)
      // For now, unsupported services are silently ignored
    }

    // Update card only if at least one service was synced
    if (syncedServices.length > 0) {
      await this.cardRepository.update(input.userId, {
        connectedServices: updatedServices,
      });
    }

    return {
      success: true,
      syncedServices,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Sync GitHub service
   * @param {string | undefined} accessToken GitHub access token
   * @return {Promise<SyncServiceResult>} Sync result
   */
  private async syncGitHub(accessToken: string | undefined): Promise<SyncServiceResult> {
    if (!accessToken) {
      return {
        success: false,
        error: "token-not-found",
      };
    }

    const result = await this.gitHubService.fetchUserInfo(accessToken);
    if (result.success && result.data) {
      return {
        success: true,
        data: this.gitHubService.toConnectedService(result.data),
      };
    }

    return {
      success: false,
      error: result.error,
    };
  }
}
