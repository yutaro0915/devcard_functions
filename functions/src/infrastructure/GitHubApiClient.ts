import axios from "axios";
import {
  IGitHubService,
  GitHubUserInfo,
  GitHubSyncResult,
} from "../domain/IGitHubService";
import {ConnectedService} from "../domain/PublicCard";

/**
 * GitHub API client implementation
 * Fetches user information from GitHub REST API v3
 */
export class GitHubApiClient implements IGitHubService {
  private readonly apiBaseUrl = "https://api.github.com";

  /**
   * Fetch basic user information from GitHub API
   * @param {string} accessToken GitHub OAuth access token
   * @return {Promise<GitHubSyncResult>} user info or error
   */
  async fetchUserInfo(accessToken: string): Promise<GitHubSyncResult> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      const data = response.data;

      // Validate required fields
      if (!data.login || !data.avatar_url || !data.html_url) {
        return {
          success: false,
          error: "api-error",
        };
      }

      const userInfo: GitHubUserInfo = {
        username: data.login,
        name: data.name || undefined,
        avatarUrl: data.avatar_url,
        bio: data.bio || undefined,
        profileUrl: data.html_url,
      };

      return {
        success: true,
        data: userInfo,
      };
    } catch (error) {
      // Handle axios errors with response
      const err = error as {response?: {status?: number}};
      if (err.response?.status === 401) {
        return {
          success: false,
          error: "token-expired",
        };
      }

      // All other errors are treated as api-error
      return {
        success: false,
        error: "api-error",
      };
    }
  }

  /**
   * Convert GitHub user info to ConnectedService format
   * @param {GitHubUserInfo} userInfo GitHub user information
   * @return {ConnectedService} object
   */
  toConnectedService(userInfo: GitHubUserInfo): ConnectedService {
    const service: ConnectedService = {
      serviceName: "github",
      username: userInfo.username,
      profileUrl: userInfo.profileUrl,
      avatarUrl: userInfo.avatarUrl,
    };

    // Add optional fields
    if (userInfo.bio) {
      service.bio = userInfo.bio;
    }

    // Store name in stats if present
    if (userInfo.name) {
      service.stats = {
        name: userInfo.name,
      };
    }

    return service;
  }
}
