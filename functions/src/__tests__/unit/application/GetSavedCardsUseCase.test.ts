import {GetSavedCardsUseCase} from "../../../application/GetSavedCardsUseCase";
import {ISavedCardRepository} from "../../../domain/ISavedCardRepository";
import {IPublicCardRepository} from "../../../domain/IPublicCardRepository";
import {IPrivateCardRepository} from "../../../domain/IPrivateCardRepository";
import {SavedCard} from "../../../domain/SavedCard";
import {PublicCard} from "../../../domain/PublicCard";

const mockSavedCardRepository: jest.Mocked<ISavedCardRepository> = {
  save: jest.fn(),
  findByUserId: jest.fn(),
  findById: jest.fn(),
  exists: jest.fn(),
  delete: jest.fn(),
  deleteById: jest.fn(),
  update: jest.fn(),
  updateById: jest.fn(),
};

const mockPublicCardRepository: jest.Mocked<IPublicCardRepository> = {
  create: jest.fn(),
  findByUserId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockPrivateCardRepository: jest.Mocked<IPrivateCardRepository> = {
  create: jest.fn(),
  findByUserId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe("GetSavedCardsUseCase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should get saved public cards with details successfully", async () => {
    const userId = "user-123";

    const savedCards: SavedCard[] = [
      {
        savedCardId: "saved-1",
        cardUserId: "card-user-1",
        cardType: "public",
        savedAt: new Date(),
        memo: "Met at conference",
        tags: ["conference"],
      },
      {
        savedCardId: "saved-2",
        cardUserId: "card-user-2",
        cardType: "public",
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

    const useCase = new GetSavedCardsUseCase(
      mockSavedCardRepository,
      mockPublicCardRepository,
      mockPrivateCardRepository
    );
    const result = await useCase.execute(userId);

    expect(result).toHaveLength(2);
    expect(result[0].savedCardId).toEqual("saved-1");
    expect(result[0].cardType).toEqual("public");
    expect(result[0].displayName).toEqual("User 1");
    expect(result[1].savedCardId).toEqual("saved-2");
    expect(result[1].cardType).toEqual("public");
    expect(result[1].displayName).toEqual("User 2");

    expect(mockSavedCardRepository.findByUserId).toHaveBeenCalledWith(userId, undefined);
    expect(mockPublicCardRepository.findByUserId).toHaveBeenCalledTimes(2);
  });

  it("should handle deleted cards gracefully", async () => {
    const userId = "user-123";

    const savedCards: SavedCard[] = [
      {
        savedCardId: "saved-1",
        cardUserId: "card-user-1",
        cardType: "public",
        savedAt: new Date(),
      },
      {
        savedCardId: "saved-2",
        cardUserId: "deleted-card",
        cardType: "public",
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

    const useCase = new GetSavedCardsUseCase(
      mockSavedCardRepository,
      mockPublicCardRepository,
      mockPrivateCardRepository
    );
    const result = await useCase.execute(userId);

    expect(result).toHaveLength(2);
    expect(result[0].displayName).toEqual("User 1");
    expect(result[0].isDeleted).toBeUndefined();
    expect(result[1].displayName).toEqual("[Deleted]");
    expect(result[1].isDeleted).toBe(true);
  });

  it("should return empty array if no saved cards", async () => {
    const userId = "user-with-no-cards";

    mockSavedCardRepository.findByUserId.mockResolvedValue([]);

    const useCase = new GetSavedCardsUseCase(
      mockSavedCardRepository,
      mockPublicCardRepository,
      mockPrivateCardRepository
    );
    const result = await useCase.execute(userId);

    expect(result).toEqual([]);
    expect(mockPublicCardRepository.findByUserId).not.toHaveBeenCalled();
  });

  it("should calculate hasUpdate correctly when card is updated", async () => {
    const userId = "user-123";
    const oldDate = new Date("2024-01-01");
    const newDate = new Date("2024-01-02");

    const savedCards: SavedCard[] = [
      {
        savedCardId: "saved-1",
        cardUserId: "card-user-1",
        cardType: "public",
        savedAt: oldDate,
        lastKnownUpdatedAt: oldDate,
      },
    ];

    const publicCard: PublicCard = {
      userId: "card-user-1",
      displayName: "User 1",
      connectedServices: {},
      theme: "default",
      updatedAt: newDate,
    };

    mockSavedCardRepository.findByUserId.mockResolvedValue(savedCards);
    mockPublicCardRepository.findByUserId.mockResolvedValue(publicCard);

    const useCase = new GetSavedCardsUseCase(
      mockSavedCardRepository,
      mockPublicCardRepository,
      mockPrivateCardRepository
    );
    const result = await useCase.execute(userId);

    expect(result).toHaveLength(1);
    expect(result[0].hasUpdate).toBe(true);
  });

  // Issue #20: Test boundary condition where timestamps are equal
  it("should calculate hasUpdate=true when lastKnownUpdatedAt equals masterUpdatedAt", async () => {
    const userId = "user-123";
    const sameDate = new Date("2024-01-01T12:00:00.000Z");

    const savedCards: SavedCard[] = [
      {
        savedCardId: "saved-1",
        cardUserId: "card-user-1",
        cardType: "public",
        savedAt: sameDate,
        lastKnownUpdatedAt: sameDate,
      },
    ];

    const publicCard: PublicCard = {
      userId: "card-user-1",
      displayName: "User 1",
      connectedServices: {},
      theme: "default",
      updatedAt: sameDate, // Same timestamp (boundary condition)
    };

    mockSavedCardRepository.findByUserId.mockResolvedValue(savedCards);
    mockPublicCardRepository.findByUserId.mockResolvedValue(publicCard);

    const useCase = new GetSavedCardsUseCase(
      mockSavedCardRepository,
      mockPublicCardRepository,
      mockPrivateCardRepository
    );
    const result = await useCase.execute(userId);

    expect(result).toHaveLength(1);
    // Issue #53: Fixed to use < instead of <=. When timestamps are equal, hasUpdate should be false (viewed)
    expect(result[0].hasUpdate).toBe(false);
  });

  it("should calculate hasUpdate=true when lastKnownUpdatedAt is undefined", async () => {
    const userId = "user-123";
    const now = new Date();

    const savedCards: SavedCard[] = [
      {
        savedCardId: "saved-1",
        cardUserId: "card-user-1",
        cardType: "public",
        savedAt: now,
        // lastKnownUpdatedAt is undefined (old saved card)
      },
    ];

    const publicCard: PublicCard = {
      userId: "card-user-1",
      displayName: "User 1",
      connectedServices: {},
      theme: "default",
      updatedAt: now,
    };

    mockSavedCardRepository.findByUserId.mockResolvedValue(savedCards);
    mockPublicCardRepository.findByUserId.mockResolvedValue(publicCard);

    const useCase = new GetSavedCardsUseCase(
      mockSavedCardRepository,
      mockPublicCardRepository,
      mockPrivateCardRepository
    );
    const result = await useCase.execute(userId);

    expect(result).toHaveLength(1);
    expect(result[0].hasUpdate).toBe(true);
  });
});
