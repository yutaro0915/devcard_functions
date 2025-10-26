import {ManualSyncUseCase} from "../../../application/ManualSyncUseCase";
import {IUserRepository} from "../../../domain/IUserRepository";
import {IPublicCardRepository} from "../../../domain/IPublicCardRepository";
import {IGitHubService} from "../../../domain/IGitHubService";
import {User} from "../../../domain/User";
import {PublicCard} from "../../../domain/PublicCard";

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
  fetchUserInfo: jest.fn(),
  toConnectedService: jest.fn(),
};

describe("ManualSyncUseCase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should sync GitHub successfully", async () => {
    const input = {
      userId: "user-123",
      services: ["github"],
    };

    const existingUser: User = {
      userId: "user-123",
      email: "test@example.com",
      displayName: "Test User",
      githubAccessToken: "valid_github_token",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingPublicCard: PublicCard = {
      userId: "user-123",
      displayName: "Test User",
      connectedServices: {},
      theme: "default",
      updatedAt: new Date(),
    };

    const gitHubUserInfo = {
      username: "testuser",
      name: "Test User",
      avatarUrl: "https://avatars.githubusercontent.com/u/123",
      bio: "Software Engineer",
      profileUrl: "https://github.com/testuser",
    };

    const connectedService = {
      serviceName: "github",
      username: "testuser",
      profileUrl: "https://github.com/testuser",
      avatarUrl: "https://avatars.githubusercontent.com/u/123",
      bio: "Software Engineer",
      stats: {
        name: "Test User",
      },
    };

    mockUserRepository.findById.mockResolvedValue(existingUser);
    mockPublicCardRepository.findByUserId.mockResolvedValue(existingPublicCard);
    mockGitHubService.fetchUserInfo.mockResolvedValue({
      success: true,
      data: gitHubUserInfo,
    });
    mockGitHubService.toConnectedService.mockReturnValue(connectedService);
    mockPublicCardRepository.update.mockResolvedValue(undefined);

    const useCase = new ManualSyncUseCase(
      mockUserRepository,
      mockPublicCardRepository,
      mockGitHubService
    );

    const result = await useCase.execute(input);

    expect(result.success).toBe(true);
    expect(result.syncedServices).toEqual(["github"]);
    expect(result.errors).toBeUndefined();

    expect(mockUserRepository.findById).toHaveBeenCalledWith("user-123");
    expect(mockGitHubService.fetchUserInfo).toHaveBeenCalledWith(
      "valid_github_token"
    );
    expect(mockGitHubService.toConnectedService).toHaveBeenCalledWith(
      gitHubUserInfo
    );
    expect(mockPublicCardRepository.update).toHaveBeenCalledWith("user-123", {
      connectedServices: {
        github: connectedService,
      },
    });
  });

  it("should return token-not-found error when GitHub token is not saved", async () => {
    const input = {
      userId: "user-123",
      services: ["github"],
    };

    const existingUser: User = {
      userId: "user-123",
      email: "test@example.com",
      displayName: "Test User",
      // githubAccessToken is undefined
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUserRepository.findById.mockResolvedValue(existingUser);

    const useCase = new ManualSyncUseCase(
      mockUserRepository,
      mockPublicCardRepository,
      mockGitHubService
    );

    const result = await useCase.execute(input);

    expect(result.success).toBe(true);
    expect(result.syncedServices).toEqual([]);
    expect(result.errors).toEqual([
      {
        service: "github",
        error: "token-not-found",
      },
    ]);

    expect(mockGitHubService.fetchUserInfo).not.toHaveBeenCalled();
    expect(mockPublicCardRepository.update).not.toHaveBeenCalled();
  });

  it("should return token-expired error when GitHub API returns 401", async () => {
    const input = {
      userId: "user-123",
      services: ["github"],
    };

    const existingUser: User = {
      userId: "user-123",
      email: "test@example.com",
      displayName: "Test User",
      githubAccessToken: "expired_token",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUserRepository.findById.mockResolvedValue(existingUser);
    mockGitHubService.fetchUserInfo.mockResolvedValue({
      success: false,
      error: "token-expired",
    });

    const useCase = new ManualSyncUseCase(
      mockUserRepository,
      mockPublicCardRepository,
      mockGitHubService
    );

    const result = await useCase.execute(input);

    expect(result.success).toBe(true);
    expect(result.syncedServices).toEqual([]);
    expect(result.errors).toEqual([
      {
        service: "github",
        error: "token-expired",
      },
    ]);

    expect(mockGitHubService.fetchUserInfo).toHaveBeenCalledWith(
      "expired_token"
    );
    expect(mockPublicCardRepository.update).not.toHaveBeenCalled();
  });

  it("should return api-error when GitHub API fails", async () => {
    const input = {
      userId: "user-123",
      services: ["github"],
    };

    const existingUser: User = {
      userId: "user-123",
      email: "test@example.com",
      displayName: "Test User",
      githubAccessToken: "valid_token",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUserRepository.findById.mockResolvedValue(existingUser);
    mockGitHubService.fetchUserInfo.mockResolvedValue({
      success: false,
      error: "api-error",
    });

    const useCase = new ManualSyncUseCase(
      mockUserRepository,
      mockPublicCardRepository,
      mockGitHubService
    );

    const result = await useCase.execute(input);

    expect(result.success).toBe(true);
    expect(result.syncedServices).toEqual([]);
    expect(result.errors).toEqual([
      {
        service: "github",
        error: "api-error",
      },
    ]);
  });

  it("should throw error if user not found", async () => {
    const input = {
      userId: "nonexistent-user",
      services: ["github"],
    };

    mockUserRepository.findById.mockResolvedValue(null);

    const useCase = new ManualSyncUseCase(
      mockUserRepository,
      mockPublicCardRepository,
      mockGitHubService
    );

    await expect(useCase.execute(input)).rejects.toThrow(
      "User nonexistent-user not found"
    );
  });

  it("should throw error if public card not found", async () => {
    const input = {
      userId: "user-123",
      services: ["github"],
    };

    const existingUser: User = {
      userId: "user-123",
      email: "test@example.com",
      displayName: "Test User",
      githubAccessToken: "valid_token",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const gitHubUserInfo = {
      username: "testuser",
      name: "Test User",
      avatarUrl: "https://avatars.githubusercontent.com/u/123",
      bio: "Software Engineer",
      profileUrl: "https://github.com/testuser",
    };

    mockUserRepository.findById.mockResolvedValue(existingUser);
    mockPublicCardRepository.findByUserId.mockResolvedValue(null);
    mockGitHubService.fetchUserInfo.mockResolvedValue({
      success: true,
      data: gitHubUserInfo,
    });

    const useCase = new ManualSyncUseCase(
      mockUserRepository,
      mockPublicCardRepository,
      mockGitHubService
    );

    await expect(useCase.execute(input)).rejects.toThrow(
      "PublicCard for user user-123 not found"
    );
  });

  it("should ignore unsupported services", async () => {
    const input = {
      userId: "user-123",
      services: ["github", "unsupported-service"],
    };

    const existingUser: User = {
      userId: "user-123",
      email: "test@example.com",
      displayName: "Test User",
      githubAccessToken: "valid_token",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingPublicCard: PublicCard = {
      userId: "user-123",
      displayName: "Test User",
      connectedServices: {},
      theme: "default",
      updatedAt: new Date(),
    };

    const gitHubUserInfo = {
      username: "testuser",
      avatarUrl: "https://avatars.githubusercontent.com/u/123",
      profileUrl: "https://github.com/testuser",
    };

    const connectedService = {
      serviceName: "github",
      username: "testuser",
      profileUrl: "https://github.com/testuser",
      avatarUrl: "https://avatars.githubusercontent.com/u/123",
    };

    mockUserRepository.findById.mockResolvedValue(existingUser);
    mockPublicCardRepository.findByUserId.mockResolvedValue(existingPublicCard);
    mockGitHubService.fetchUserInfo.mockResolvedValue({
      success: true,
      data: gitHubUserInfo,
    });
    mockGitHubService.toConnectedService.mockReturnValue(connectedService);
    mockPublicCardRepository.update.mockResolvedValue(undefined);

    const useCase = new ManualSyncUseCase(
      mockUserRepository,
      mockPublicCardRepository,
      mockGitHubService
    );

    const result = await useCase.execute(input);

    // Only github should be synced, unsupported-service is ignored
    expect(result.success).toBe(true);
    expect(result.syncedServices).toEqual(["github"]);
    expect(result.errors).toBeUndefined();
  });

  it("should preserve existing connected services", async () => {
    const input = {
      userId: "user-123",
      services: ["github"],
    };

    const existingUser: User = {
      userId: "user-123",
      email: "test@example.com",
      displayName: "Test User",
      githubAccessToken: "valid_token",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingPublicCard: PublicCard = {
      userId: "user-123",
      displayName: "Test User",
      connectedServices: {
        existingService: {
          serviceName: "existingService",
          username: "existing",
          profileUrl: "https://example.com",
        },
      },
      theme: "default",
      updatedAt: new Date(),
    };

    const gitHubUserInfo = {
      username: "testuser",
      avatarUrl: "https://avatars.githubusercontent.com/u/123",
      profileUrl: "https://github.com/testuser",
    };

    const connectedService = {
      serviceName: "github",
      username: "testuser",
      profileUrl: "https://github.com/testuser",
      avatarUrl: "https://avatars.githubusercontent.com/u/123",
    };

    mockUserRepository.findById.mockResolvedValue(existingUser);
    mockPublicCardRepository.findByUserId.mockResolvedValue(existingPublicCard);
    mockGitHubService.fetchUserInfo.mockResolvedValue({
      success: true,
      data: gitHubUserInfo,
    });
    mockGitHubService.toConnectedService.mockReturnValue(connectedService);
    mockPublicCardRepository.update.mockResolvedValue(undefined);

    const useCase = new ManualSyncUseCase(
      mockUserRepository,
      mockPublicCardRepository,
      mockGitHubService
    );

    const result = await useCase.execute(input);

    expect(result.success).toBe(true);
    expect(result.syncedServices).toEqual(["github"]);

    // Check that existing services are preserved
    expect(mockPublicCardRepository.update).toHaveBeenCalledWith("user-123", {
      connectedServices: {
        existingService: {
          serviceName: "existingService",
          username: "existing",
          profileUrl: "https://example.com",
        },
        github: connectedService,
      },
    });
  });
});
