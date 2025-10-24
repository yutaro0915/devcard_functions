import {SaveGitHubTokenUseCase} from "../../application/SaveGitHubTokenUseCase";
import {IUserRepository} from "../../domain/IUserRepository";
import {User} from "../../domain/User";

const mockUserRepository: jest.Mocked<IUserRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
};

describe("SaveGitHubTokenUseCase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should save GitHub access token successfully", async () => {
    const input = {
      userId: "test-user-123",
      accessToken: "github_token_abc123",
    };

    const existingUser: User = {
      userId: input.userId,
      email: "test@example.com",
      displayName: "Test User",
      githubAccessToken: undefined,
      xAccessToken: undefined,
      qiitaAccessToken: undefined,
      customCss: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUserRepository.findById.mockResolvedValue(existingUser);
    mockUserRepository.update.mockResolvedValue(undefined);

    const useCase = new SaveGitHubTokenUseCase(mockUserRepository);
    await useCase.execute(input);

    expect(mockUserRepository.findById).toHaveBeenCalledWith(input.userId);
    expect(mockUserRepository.update).toHaveBeenCalledWith(input.userId, {
      githubAccessToken: input.accessToken,
    });
  });

  it("should throw error if user not found", async () => {
    const input = {
      userId: "nonexistent-user",
      accessToken: "github_token_abc123",
    };

    mockUserRepository.findById.mockResolvedValue(null);

    const useCase = new SaveGitHubTokenUseCase(mockUserRepository);
    await expect(useCase.execute(input)).rejects.toThrow(
      "User nonexistent-user not found"
    );

    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });
});
