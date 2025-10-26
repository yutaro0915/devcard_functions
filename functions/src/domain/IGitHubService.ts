/**
 * GitHub user profile data
 */
export interface GitHubProfile {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
  avatarUrl: string;
  bio: string | null;
  blog: string | null;
  location: string | null;
  company: string | null;
  twitterUsername: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  createdAt: string;
}

/**
 * Recent activity on GitHub
 */
export interface GitHubActivity {
  type: "push" | "pull_request" | "issues" | "other";
  repoName: string;
  repoUrl: string;
  timestamp: string;
  description: string; // e.g., "Pushed to main", "Opened PR #123"
}

/**
 * Domain service interface for GitHub API integration
 */
export interface IGitHubService {
  /**
   * Get authenticated user's profile information
   * @param accessToken - GitHub OAuth access token
   * @returns User profile data
   */
  getUserProfile(accessToken: string): Promise<GitHubProfile>;

  /**
   * Get user's recent public activities
   * @param username - GitHub username
   * @param accessToken - GitHub OAuth access token (for rate limit)
   * @param limit - Number of activities to return (default: 5)
   * @returns Array of recent activities
   */
  getRecentActivity(
    username: string,
    accessToken: string,
    limit?: number
  ): Promise<GitHubActivity[]>;
}
