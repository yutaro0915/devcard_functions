import {SyncGitHubDataUseCase} from "../../application/SyncGitHubDataUseCase";
import {IUserRepository} from "../../domain/IUserRepository";
import {IPublicCardRepository} from "../../domain/IPublicCardRepository";
import {IGitHubService, GitHubProfile} from "../../domain/IGitHubService";
import {User} from "../../domain/User";
import {PublicCard} from "../../domain/PublicCard";

const mockUserRepository: jest.Mocked<IUserRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
};

const mockPublicCardRepository: jest.Mocked<IPublicCardRepository> = {
  create: jest.fn(),
  findByUserId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockGitHubService: jest.Mocked<IGitHubService> = {
  getUserProfile: jest.fn(),
  getRecentActivity: jest.fn(),
};

describe("SyncGitHubDataUseCase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should sync GitHub data successfully", async () => {
    const userId = "test-user-123";

    const user: User = {
      userId,
      email: "test@example.com",
      displayName: "Test User",
      githubAccessToken: "github_token_abc123",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const githubProfile: GitHubProfile = {
      login: "testuser",
      id: 12345,
      name: "Test User",
      email: "test@example.com",
      avatarUrl: "https://avatars.githubusercontent.com/u/12345",
      bio: "Test bio",
      blog: "https://testuser.dev",
      location: "Tokyo",
      company: "Test Company",
      twitterUsername: "testuser",
      publicRepos: 50,
      followers: 100,
      following: 50,
      createdAt: "2020-01-01T00:00:00Z",
    };

    const existingPublicCard: PublicCard = {
      userId,
      displayName: "Test User",
      connectedServices: {},
      theme: "default",
      updatedAt: new Date(),
    };

    mockUserRepository.findById.mockResolvedValue(user);
    mockGitHubService.getUserProfile.mockResolvedValue(githubProfile);
    mockPublicCardRepository.findByUserId.mockResolvedValue(existingPublicCard);
    mockPublicCardRepository.update.mockResolvedValue(undefined);

    const useCase = new SyncGitHubDataUseCase(
      mockUserRepository,
      mockPublicCardRepository,
      mockGitHubService
    );

    await useCase.execute(userId);

    expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    expect(mockGitHubService.getUserProfile).toHaveBeenCalledWith(user.githubAccessToken);
    expect(mockPublicCardRepository.findByUserId).toHaveBeenCalledWith(userId);
    expect(mockPublicCardRepository.update).toHaveBeenCalledWith(userId, {
      connectedServices: {
        github: {
          serviceName: "github",
          username: "testuser",
          profileUrl: "https://github.com/testuser",
          avatarUrl: "https://avatars.githubusercontent.com/u/12345",
          bio: "Test bio",
          stats: {
            publicRepos: 50,
            followers: 100,
            following: 50,
          },
        },
      },
    });
  });

  it("should throw error if user not found", async () => {
    const userId = "nonexistent-user";

    mockUserRepository.findById.mockResolvedValue(null);

    const useCase = new SyncGitHubDataUseCase(
      mockUserRepository,
      mockPublicCardRepository,
      mockGitHubService
    );

    await expect(useCase.execute(userId)).rejects.toThrow(
      "User with ID nonexistent-user not found"
    );
  });

  it("should throw error if GitHub access token not found", async () => {
    const userId = "test-user-123";

    const user: User = {
      userId,
      email: "test@example.com",
      displayName: "Test User",
      githubAccessToken: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUserRepository.findById.mockResolvedValue(user);

    const useCase = new SyncGitHubDataUseCase(
      mockUserRepository,
      mockPublicCardRepository,
      mockGitHubService
    );

    await expect(useCase.execute(userId)).rejects.toThrow(
      "GitHub access token not found for user"
    );
  });

  it("should throw error if public card not found", async () => {
    const userId = "test-user-123";

    const user: User = {
      userId,
      email: "test@example.com",
      displayName: "Test User",
      githubAccessToken: "github_token_abc123",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const githubProfile: GitHubProfile = {
      login: "testuser",
      id: 12345,
      name: "Test User",
      email: "test@example.com",
      avatarUrl: "https://avatars.githubusercontent.com/u/12345",
      bio: "Test bio",
      blog: null,
      location: null,
      company: null,
      twitterUsername: null,
      publicRepos: 10,
      followers: 20,
      following: 15,
      createdAt: "2020-01-01T00:00:00Z",
    };

    mockUserRepository.findById.mockResolvedValue(user);
    mockGitHubService.getUserProfile.mockResolvedValue(githubProfile);
    mockPublicCardRepository.findByUserId.mockResolvedValue(null);

    const useCase = new SyncGitHubDataUseCase(
      mockUserRepository,
      mockPublicCardRepository,
      mockGitHubService
    );

    await expect(useCase.execute(userId)).rejects.toThrow(
      "PublicCard for user test-user-123 not found"
    );
  });
});
