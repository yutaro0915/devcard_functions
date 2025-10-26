import {Octokit} from "@octokit/rest";
import {
  IGitHubService,
  GitHubProfile,
  GitHubActivity,
} from "../domain/IGitHubService";

/**
 * Implementation of GitHub API service using Octokit
 */
export class GitHubService implements IGitHubService {
  /**
   * Get authenticated user's profile information
   */
  async getUserProfile(accessToken: string): Promise<GitHubProfile> {
    const octokit = new Octokit({auth: accessToken});

    const {data} = await octokit.rest.users.getAuthenticated();

    return {
      login: data.login,
      id: data.id,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatar_url,
      bio: data.bio,
      blog: data.blog || null,
      location: data.location,
      company: data.company,
      twitterUsername: data.twitter_username || null,
      publicRepos: data.public_repos,
      followers: data.followers,
      following: data.following,
      createdAt: data.created_at,
    };
  }

  /**
   * Get user's recent public activities
   */
  async getRecentActivity(
    username: string,
    accessToken: string,
    limit: number = 5
  ): Promise<GitHubActivity[]> {
    const octokit = new Octokit({auth: accessToken});

    const {data} = await octokit.rest.activity.listPublicEventsForUser({
      username,
      per_page: 30, // Fetch more to filter down to relevant ones
    });

    const activities: GitHubActivity[] = [];
    const seenRepos = new Set<string>();

    for (const event of data) {
      if (activities.length >= limit) break;

      const repoName = event.repo.name;
      if (seenRepos.has(repoName)) continue; // Skip duplicate repos

      let activity: GitHubActivity | null = null;

      switch (event.type) {
      case "PushEvent":
        activity = {
          type: "push",
          repoName,
          repoUrl: `https://github.com/${repoName}`,
          timestamp: event.created_at || "",
          description: "Pushed commits",
        };
        break;
      case "PullRequestEvent": {
        const prPayload = event.payload as {action?: string; pull_request?: {number?: number}};
        if (prPayload.action === "opened") {
          activity = {
            type: "pull_request",
            repoName,
            repoUrl: `https://github.com/${repoName}`,
            timestamp: event.created_at || "",
            description: `Opened PR #${prPayload.pull_request?.number || ""}`,
          };
        }
        break;
      }
      case "IssuesEvent": {
        const issuePayload = event.payload as {action?: string; issue?: {number?: number}};
        if (issuePayload.action === "opened") {
          activity = {
            type: "issues",
            repoName,
            repoUrl: `https://github.com/${repoName}`,
            timestamp: event.created_at || "",
            description: `Opened issue #${issuePayload.issue?.number || ""}`,
          };
        }
        break;
      }
      }

      if (activity) {
        activities.push(activity);
        seenRepos.add(repoName);
      }
    }

    return activities;
  }
}
