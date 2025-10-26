import {SaveCardUseCase} from "../../../application/SaveCardUseCase";
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

    const publicCard: PublicCard = {
      userId: input.cardUserId,
      displayName: "Card User",
      connectedServices: {},
      theme: "default",
      updatedAt: new Date(),
    };

    const savedCard: SavedCard = {
      cardUserId: input.cardUserId,
      savedAt: new Date(),
      memo: input.memo,
      tags: input.tags,
      eventId: input.eventId,
      badge: input.badge,
    };

    mockPublicCardRepository.findByUserId.mockResolvedValue(publicCard);
    mockSavedCardRepository.exists.mockResolvedValue(false);
    mockSavedCardRepository.save.mockResolvedValue(savedCard);

    const useCase = new SaveCardUseCase(mockSavedCardRepository, mockPublicCardRepository);
    const result = await useCase.execute(input);

    expect(result).toEqual(savedCard);
    expect(mockPublicCardRepository.findByUserId).toHaveBeenCalledWith(input.cardUserId);
    expect(mockSavedCardRepository.exists).toHaveBeenCalledWith(input.userId, input.cardUserId);
    expect(mockSavedCardRepository.save).toHaveBeenCalledWith({
      userId: input.userId,
      cardUserId: input.cardUserId,
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

    mockPublicCardRepository.findByUserId.mockResolvedValue(null);

    const useCase = new SaveCardUseCase(mockSavedCardRepository, mockPublicCardRepository);
    await expect(useCase.execute(input)).rejects.toThrow(
      "PublicCard nonexistent-card not found"
    );

    expect(mockSavedCardRepository.save).not.toHaveBeenCalled();
  });

  it("should throw error if card already saved", async () => {
    const input = {
      userId: "user-123",
      cardUserId: "card-user-456",
    };

    const publicCard: PublicCard = {
      userId: input.cardUserId,
      displayName: "Card User",
      connectedServices: {},
      theme: "default",
      updatedAt: new Date(),
    };

    mockPublicCardRepository.findByUserId.mockResolvedValue(publicCard);
    mockSavedCardRepository.exists.mockResolvedValue(true);

    const useCase = new SaveCardUseCase(mockSavedCardRepository, mockPublicCardRepository);
    await expect(useCase.execute(input)).rejects.toThrow(
      "Card card-user-456 is already saved"
    );

    expect(mockSavedCardRepository.save).not.toHaveBeenCalled();
  });
});
