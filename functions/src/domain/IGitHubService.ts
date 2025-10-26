import {ConnectedService} from "./PublicCard";

/**
 * GitHub basic user information
 */
export interface GitHubUserInfo {
  username: string; // login
  name?: string; // full name
  avatarUrl: string;
  bio?: string;
  profileUrl: string; // html_url
}

/**
 * Result of GitHub sync operation
 */
export interface GitHubSyncResult {
  success: boolean;
  data?: GitHubUserInfo;
  error?: "token-not-found" | "token-expired" | "api-error";
}

/**
 * Service interface for GitHub API operations
 * This interface is implemented in the Infrastructure layer
 */
export interface IGitHubService {
  /**
   * Fetch basic user information from GitHub API
   * @param accessToken GitHub OAuth access token
   * @returns GitHubSyncResult with user info or error
   */
  fetchUserInfo(accessToken: string): Promise<GitHubSyncResult>;

  /**
   * Convert GitHub user info to ConnectedService format
   * @param userInfo GitHub user information
   * @returns ConnectedService object
   */
  toConnectedService(userInfo: GitHubUserInfo): ConnectedService;
}
