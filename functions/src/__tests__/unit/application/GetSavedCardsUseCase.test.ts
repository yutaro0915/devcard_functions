import {GetSavedCardsUseCase} from "../../../application/GetSavedCardsUseCase";
import {ISavedCardRepository} from "../../../domain/ISavedCardRepository";
import {IPublicCardRepository} from "../../../domain/IPublicCardRepository";
import {SavedCard} from "../../../domain/SavedCard";
import {PublicCard} from "../../../domain/PublicCard";

const mockSavedCardRepository: jest.Mocked<ISavedCardRepository> = {
  save: jest.fn(),
  findByUserId: jest.fn(),
  exists: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
};

const mockPublicCardRepository: jest.Mocked<IPublicCardRepository> = {
  create: jest.fn(),
  findByUserId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe("GetSavedCardsUseCase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should get saved cards with details successfully", async () => {
    const userId = "user-123";

    const savedCards: SavedCard[] = [
      {
        cardUserId: "card-user-1",
        savedAt: new Date(),
        memo: "Met at conference",
        tags: ["conference"],
      },
      {
        cardUserId: "card-user-2",
        savedAt: new Date(),
        badge: "speaker",
      },
    ];

    const publicCard1: PublicCard = {
      userId: "card-user-1",
      displayName: "User 1",
      connectedServices: {},
      theme: "default",
      updatedAt: new Date(),
    };

    const publicCard2: PublicCard = {
      userId: "card-user-2",
      displayName: "User 2",
      connectedServices: {},
      theme: "default",
      updatedAt: new Date(),
    };

    mockSavedCardRepository.findByUserId.mockResolvedValue(savedCards);
    mockPublicCardRepository.findByUserId
      .mockResolvedValueOnce(publicCard1)
      .mockResolvedValueOnce(publicCard2);

    const useCase = new GetSavedCardsUseCase(mockSavedCardRepository, mockPublicCardRepository);
    const result = await useCase.execute(userId);

    expect(result).toHaveLength(2);
    expect(result[0].savedCard).toEqual(savedCards[0]);
    expect(result[0].publicCard).toEqual(publicCard1);
    expect(result[1].savedCard).toEqual(savedCards[1]);
    expect(result[1].publicCard).toEqual(publicCard2);

    expect(mockSavedCardRepository.findByUserId).toHaveBeenCalledWith(userId);
    expect(mockPublicCardRepository.findByUserId).toHaveBeenCalledTimes(2);
  });

  it("should handle deleted cards gracefully", async () => {
    const userId = "user-123";

    const savedCards: SavedCard[] = [
      {
        cardUserId: "card-user-1",
        savedAt: new Date(),
      },
      {
        cardUserId: "deleted-card",
        savedAt: new Date(),
      },
    ];

    const publicCard1: PublicCard = {
      userId: "card-user-1",
      displayName: "User 1",
      connectedServices: {},
      theme: "default",
      updatedAt: new Date(),
    };

    mockSavedCardRepository.findByUserId.mockResolvedValue(savedCards);
    mockPublicCardRepository.findByUserId
      .mockResolvedValueOnce(publicCard1)
      .mockResolvedValueOnce(null); // Card was deleted

    const useCase = new GetSavedCardsUseCase(mockSavedCardRepository, mockPublicCardRepository);
    const result = await useCase.execute(userId);

    expect(result).toHaveLength(2);
    expect(result[0].publicCard).toEqual(publicCard1);
    expect(result[1].publicCard).toBeNull(); // Deleted card
  });

  it("should return empty array if no saved cards", async () => {
    const userId = "user-with-no-cards";

    mockSavedCardRepository.findByUserId.mockResolvedValue([]);

    const useCase = new GetSavedCardsUseCase(mockSavedCardRepository, mockPublicCardRepository);
    const result = await useCase.execute(userId);

    expect(result).toEqual([]);
    expect(mockPublicCardRepository.findByUserId).not.toHaveBeenCalled();
  });
});
