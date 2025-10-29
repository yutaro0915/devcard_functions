import {SaveCardUseCase} from "../../../application/SaveCardUseCase";
import {ISavedCardRepository} from "../../../domain/ISavedCardRepository";
import {ICardRepository} from "../../../domain/ICardRepository";
import {SavedCard} from "../../../domain/SavedCard";
import {Card} from "../../../domain/Card";

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

const mockCardRepository: jest.Mocked<ICardRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
};

describe("SaveCardUseCase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should save a card successfully", async () => {
    const input = {
      userId: "user-123",
      cardUserId: "card-user-456",
      memo: "Met at conference",
      tags: ["conference", "frontend"],
      eventId: "event-789",
      badge: "speaker",
    };

    const publicCard: Card = {
      userId: input.cardUserId,
      displayName: "Card User",
      connectedServices: {},
      visibility: {bio: "public", backgroundImage: "public", badges: "public"},
      theme: "default",
      updatedAt: new Date(),
    };

    const savedCard: SavedCard = {
      savedCardId: "random-id-1",
      cardUserId: input.cardUserId,
      cardType: "public",
      savedAt: new Date(),
      lastKnownUpdatedAt: publicCard.updatedAt,
      memo: input.memo,
      tags: input.tags,
      eventId: input.eventId,
      badge: input.badge,
    };

    mockCardRepository.findById.mockResolvedValue(publicCard);
    mockSavedCardRepository.save.mockResolvedValue(savedCard);

    const useCase = new SaveCardUseCase(mockSavedCardRepository, mockCardRepository);
    const result = await useCase.execute(input);

    expect(result).toEqual(savedCard);
    expect(mockCardRepository.findById).toHaveBeenCalledWith(input.cardUserId);
    expect(mockSavedCardRepository.save).toHaveBeenCalledWith({
      userId: input.userId,
      cardUserId: input.cardUserId,
      cardType: "public",
      lastKnownUpdatedAt: publicCard.updatedAt,
      memo: input.memo,
      tags: input.tags,
      eventId: input.eventId,
      badge: input.badge,
    });
  });

  it("should throw error if public card not found", async () => {
    const input = {
      userId: "user-123",
      cardUserId: "nonexistent-card",
    };

    mockCardRepository.findById.mockResolvedValue(null);

    const useCase = new SaveCardUseCase(mockSavedCardRepository, mockCardRepository);
    await expect(useCase.execute(input)).rejects.toThrow("Card nonexistent-card not found");

    expect(mockSavedCardRepository.save).not.toHaveBeenCalled();
  });
});
