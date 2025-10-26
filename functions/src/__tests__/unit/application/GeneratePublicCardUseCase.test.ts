import {GeneratePublicCardUseCase} from "../../../application/GeneratePublicCardUseCase";
import {IPublicCardRepository} from "../../../domain/IPublicCardRepository";
import {PublicCard} from "../../../domain/PublicCard";

const mockPublicCardRepository: jest.Mocked<IPublicCardRepository> = {
  create: jest.fn(),
  findByUserId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe("GeneratePublicCardUseCase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should generate a new public card successfully", async () => {
    const input = {
      userId: "test-user-123",
      displayName: "Test User",
      photoURL: "https://example.com/photo.jpg",
      bio: "Test bio",
    };

    const expectedCard: PublicCard = {
      userId: input.userId,
      displayName: input.displayName,
      photoURL: input.photoURL,
      bio: input.bio,
      connectedServices: {},
      theme: "default",
      customCss: undefined,
      updatedAt: new Date(),
    };

    mockPublicCardRepository.findByUserId.mockResolvedValue(null);
    mockPublicCardRepository.create.mockResolvedValue(expectedCard);

    const useCase = new GeneratePublicCardUseCase(mockPublicCardRepository);
    const result = await useCase.execute(input);

    expect(result).toEqual(expectedCard);
    expect(mockPublicCardRepository.findByUserId).toHaveBeenCalledWith(input.userId);
    expect(mockPublicCardRepository.create).toHaveBeenCalledWith({
      ...input,
      theme: "default",
    });
  });

  it("should throw error if public card already exists", async () => {
    const input = {
      userId: "existing-user",
      displayName: "Existing User",
    };

    const existingCard: PublicCard = {
      userId: input.userId,
      displayName: input.displayName,
      connectedServices: {},
      theme: "default",
      updatedAt: new Date(),
    };

    mockPublicCardRepository.findByUserId.mockResolvedValue(existingCard);

    const useCase = new GeneratePublicCardUseCase(mockPublicCardRepository);
    await expect(useCase.execute(input)).rejects.toThrow(
      "PublicCard for user existing-user already exists"
    );

    expect(mockPublicCardRepository.create).not.toHaveBeenCalled();
  });
});
