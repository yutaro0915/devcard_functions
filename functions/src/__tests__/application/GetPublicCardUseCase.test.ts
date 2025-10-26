import {GetPublicCardUseCase} from "../../application/GetPublicCardUseCase";
import {IPublicCardRepository} from "../../domain/IPublicCardRepository";
import {PublicCard} from "../../domain/PublicCard";

const mockPublicCardRepository: jest.Mocked<IPublicCardRepository> = {
  create: jest.fn(),
  findByUserId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe("GetPublicCardUseCase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should get public card successfully", async () => {
    const userId = "test-user-123";

    const publicCard: PublicCard = {
      userId,
      displayName: "Test User",
      photoURL: "https://example.com/photo.jpg",
      bio: "Test bio",
      connectedServices: {
        github: {
          serviceName: "github",
          username: "testuser",
          profileUrl: "https://github.com/testuser",
          avatarUrl: "https://avatars.githubusercontent.com/u/12345",
          bio: "Developer",
          stats: {
            publicRepos: 50,
            followers: 100,
            following: 50,
          },
        },
      },
      theme: "default",
      updatedAt: new Date(),
    };

    mockPublicCardRepository.findByUserId.mockResolvedValue(publicCard);

    const useCase = new GetPublicCardUseCase(mockPublicCardRepository);
    const result = await useCase.execute(userId);

    expect(mockPublicCardRepository.findByUserId).toHaveBeenCalledWith(userId);
    expect(result).toEqual(publicCard);
  });

  it("should throw error if public card not found", async () => {
    const userId = "nonexistent-user";

    mockPublicCardRepository.findByUserId.mockResolvedValue(null);

    const useCase = new GetPublicCardUseCase(mockPublicCardRepository);

    await expect(useCase.execute(userId)).rejects.toThrow(
      "PublicCard for user nonexistent-user not found"
    );
  });
});
