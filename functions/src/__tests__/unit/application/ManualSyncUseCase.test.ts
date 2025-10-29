import {ManualSyncUseCase} from "../../../application/ManualSyncUseCase";
import {IUserRepository} from "../../../domain/IUserRepository";
import {ICardRepository} from "../../../domain/ICardRepository";
import {IGitHubService} from "../../../domain/IGitHubService";
import {User} from "../../../domain/User";
import {Card} from "../../../domain/Card";
import {UserNotFoundError} from "../../../domain/errors/DomainErrors";

const mockUserRepository: jest.Mocked<IUserRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
};

const mockCardRepository: jest.Mocked<ICardRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  exists: jest.fn(),
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

    const existingCard: Card = {
      userId: "user-123",
      displayName: "Test User",
      visibility: {bio: "public", backgroundImageUrl: "public", badges: "public"},
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

    mockUserRepository.findById.mockResolvedValue(existingUser);
    mockCardRepository.findById.mockResolvedValue(existingCard);
    mockGitHubService.fetchUserInfo.mockResolvedValue({
      success: true,
      data: gitHubUserInfo,
    });
    mockCardRepository.update.mockResolvedValue(undefined);

    const useCase = new ManualSyncUseCase(
      mockUserRepository,
      mockCardRepository,
      mockGitHubService
    );

    const result = await useCase.execute(input);

    expect(result.success).toBe(true);
    expect(result.syncedServices).toEqual(["github"]);
    expect(result.errors).toBeUndefined();

    expect(mockUserRepository.findById).toHaveBeenCalledWith("user-123");
    expect(mockGitHubService.fetchUserInfo).toHaveBeenCalledWith("valid_github_token");
    expect(mockCardRepository.update).toHaveBeenCalledWith("user-123", {
      github: "testuser",
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

    const existingCard: Card = {
      userId: "user-123",
      displayName: "Test User",
      visibility: {bio: "public", backgroundImageUrl: "public", badges: "public"},
      theme: "default",
      updatedAt: new Date(),
    };

    mockUserRepository.findById.mockResolvedValue(existingUser);
    mockCardRepository.findById.mockResolvedValue(existingCard);

    const useCase = new ManualSyncUseCase(
      mockUserRepository,
      mockCardRepository,
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
    expect(mockCardRepository.update).not.toHaveBeenCalled();
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

    const existingCard: Card = {
      userId: "user-123",
      displayName: "Test User",
      visibility: {bio: "public", backgroundImageUrl: "public", badges: "public"},
      theme: "default",
      updatedAt: new Date(),
    };

    mockUserRepository.findById.mockResolvedValue(existingUser);
    mockCardRepository.findById.mockResolvedValue(existingCard);
    mockGitHubService.fetchUserInfo.mockResolvedValue({
      success: false,
      error: "token-expired",
    });

    const useCase = new ManualSyncUseCase(
      mockUserRepository,
      mockCardRepository,
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

    expect(mockGitHubService.fetchUserInfo).toHaveBeenCalledWith("expired_token");
    expect(mockCardRepository.update).not.toHaveBeenCalled();
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

    const existingCard: Card = {
      userId: "user-123",
      displayName: "Test User",
      visibility: {bio: "public", backgroundImageUrl: "public", badges: "public"},
      theme: "default",
      updatedAt: new Date(),
    };

    mockUserRepository.findById.mockResolvedValue(existingUser);
    mockCardRepository.findById.mockResolvedValue(existingCard);
    mockGitHubService.fetchUserInfo.mockResolvedValue({
      success: false,
      error: "api-error",
    });

    const useCase = new ManualSyncUseCase(
      mockUserRepository,
      mockCardRepository,
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

  // Issue #17: Test custom error class (UserNotFoundError)
  it("should throw UserNotFoundError if user not found", async () => {
    const input = {
      userId: "nonexistent-user",
      services: ["github"],
    };

    mockUserRepository.findById.mockResolvedValue(null);

    const useCase = new ManualSyncUseCase(
      mockUserRepository,
      mockCardRepository,
      mockGitHubService
    );

    await expect(useCase.execute(input)).rejects.toThrow(UserNotFoundError);
    await expect(useCase.execute(input)).rejects.toThrow("User nonexistent-user not found");
  });

  // Issue #17: Test custom error class (Error)
  it("should throw Error if public card not found", async () => {
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
    mockCardRepository.findById.mockResolvedValue(null);
    mockGitHubService.fetchUserInfo.mockResolvedValue({
      success: true,
      data: gitHubUserInfo,
    });

    const useCase = new ManualSyncUseCase(
      mockUserRepository,
      mockCardRepository,
      mockGitHubService
    );

    await expect(useCase.execute(input)).rejects.toThrow(Error);
    await expect(useCase.execute(input)).rejects.toThrow("Card not found for user user-123");
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

    const existingCard: Card = {
      userId: "user-123",
      displayName: "Test User",
      visibility: {bio: "public", backgroundImageUrl: "public", badges: "public"},
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
    mockCardRepository.findById.mockResolvedValue(existingCard);
    mockGitHubService.fetchUserInfo.mockResolvedValue({
      success: true,
      data: gitHubUserInfo,
    });
    mockGitHubService.toConnectedService.mockReturnValue(connectedService);
    mockCardRepository.update.mockResolvedValue(undefined);

    const useCase = new ManualSyncUseCase(
      mockUserRepository,
      mockCardRepository,
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

    const existingCard: Card = {
      userId: "user-123",
      displayName: "Test User",
      theme: "default",
      visibility: {bio: "public", backgroundImageUrl: "public", badges: "public"},
      updatedAt: new Date(),
    };

    const gitHubUserInfo = {
      username: "testuser",
      avatarUrl: "https://avatars.githubusercontent.com/u/123",
      profileUrl: "https://github.com/testuser",
    };

    mockUserRepository.findById.mockResolvedValue(existingUser);
    mockCardRepository.findById.mockResolvedValue(existingCard);
    mockGitHubService.fetchUserInfo.mockResolvedValue({
      success: true,
      data: gitHubUserInfo,
    });
    mockCardRepository.update.mockResolvedValue(undefined);

    const useCase = new ManualSyncUseCase(
      mockUserRepository,
      mockCardRepository,
      mockGitHubService
    );

    const result = await useCase.execute(input);

    expect(result.success).toBe(true);
    expect(result.syncedServices).toEqual(["github"]);

    // Check that github field is updated
    expect(mockCardRepository.update).toHaveBeenCalledWith("user-123", {
      github: "testuser",
    });
  });
});
