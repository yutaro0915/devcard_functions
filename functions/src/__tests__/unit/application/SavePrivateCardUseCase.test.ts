import {SavePrivateCardUseCase} from "../../../application/SavePrivateCardUseCase";
import {IExchangeTokenRepository} from "../../../domain/IExchangeTokenRepository";
import {ICardRepository} from "../../../domain/ICardRepository";
import {ISavedCardRepository} from "../../../domain/ISavedCardRepository";
import {Card} from "../../../domain/Card";
import {ExchangeToken} from "../../../domain/ExchangeToken";

const mockExchangeTokenRepository: jest.Mocked<IExchangeTokenRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  markAsUsed: jest.fn(),
  deleteExpired: jest.fn(),
  delete: jest.fn(), // Issue #50: New method
  deleteUnusedByOwnerId: jest.fn(), // Issue #50: New method
};

const mockCardRepository: jest.Mocked<ICardRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
};

const mockSavedCardRepository: jest.Mocked<ISavedCardRepository> = {
  save: jest.fn(),
  findByUserId: jest.fn(),
  findById: jest.fn(),
  exists: jest.fn(),
  deleteById: jest.fn(),
  updateById: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
};

describe("SavePrivateCardUseCase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Issue #50: Test expired token immediate deletion
  describe("[Issue #50] 期限切れトークンの即時削除", () => {
    it("期限切れトークン検出時に delete() を呼び出す", async () => {
      const userId = "user-123";
      const tokenId = "expired-token";
      const ownerId = "owner-456";

      const expiredToken: ExchangeToken = {
        tokenId,
        ownerId,
        createdAt: new Date(Date.now() - 120000), // 2 minutes ago
        expiresAt: new Date(Date.now() - 60000), // 1 minute ago (expired)
      };

      mockExchangeTokenRepository.findById.mockResolvedValue(expiredToken);
      mockExchangeTokenRepository.delete.mockResolvedValue();

      const useCase = new SavePrivateCardUseCase(
        mockExchangeTokenRepository,
        mockCardRepository,
        mockSavedCardRepository
      );

      await expect(useCase.execute({userId, tokenId})).rejects.toThrow("Token has expired");

      // Verify delete() was called
      expect(mockExchangeTokenRepository.delete).toHaveBeenCalledWith(tokenId);
      expect(mockExchangeTokenRepository.delete).toHaveBeenCalledTimes(1);

      // Verify card was NOT saved
      expect(mockSavedCardRepository.save).not.toHaveBeenCalled();
    });

    it("期限切れトークン削除に失敗した場合、削除エラーをスローする", async () => {
      const userId = "user-123";
      const tokenId = "expired-token";
      const ownerId = "owner-456";

      const expiredToken: ExchangeToken = {
        tokenId,
        ownerId,
        createdAt: new Date(Date.now() - 120000),
        expiresAt: new Date(Date.now() - 60000), // expired
      };

      mockExchangeTokenRepository.findById.mockResolvedValue(expiredToken);
      mockExchangeTokenRepository.delete.mockRejectedValue(new Error("Firestore error"));

      const useCase = new SavePrivateCardUseCase(
        mockExchangeTokenRepository,
        mockCardRepository,
        mockSavedCardRepository
      );

      // Should throw the Firestore error (deletion failed)
      await expect(useCase.execute({userId, tokenId})).rejects.toThrow("Firestore error");

      expect(mockExchangeTokenRepository.delete).toHaveBeenCalledWith(tokenId);
    });

    it("有効なトークンの場合、delete() は呼ばれない", async () => {
      const userId = "user-123";
      const tokenId = "valid-token";
      const ownerId = "owner-456";

      const validToken: ExchangeToken = {
        tokenId,
        ownerId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60000), // 1 minute from now (valid)
      };

      const card: Card = {
        userId: ownerId,
        displayName: "Owner User",
        connectedServices: {},
        theme: "default",
        visibility: {bio: "public", backgroundImage: "public", badges: "public"},
        privateContacts: {email: "owner@example.com"},
        updatedAt: new Date(),
      };

      mockExchangeTokenRepository.findById.mockResolvedValue(validToken);
      mockCardRepository.findById.mockResolvedValue(card);
      mockSavedCardRepository.save.mockResolvedValue({
        savedCardId: "saved-123",
        cardUserId: ownerId,
        cardType: "private",
        savedAt: new Date(),
        lastKnownUpdatedAt: card.updatedAt,
      });

      const useCase = new SavePrivateCardUseCase(
        mockExchangeTokenRepository,
        mockCardRepository,
        mockSavedCardRepository
      );

      await useCase.execute({userId, tokenId});

      // Verify delete() was NOT called
      expect(mockExchangeTokenRepository.delete).not.toHaveBeenCalled();

      // Verify card WAS saved
      expect(mockSavedCardRepository.save).toHaveBeenCalled();
      expect(mockExchangeTokenRepository.markAsUsed).toHaveBeenCalled();
    });
  });

  describe("既存の動作検証", () => {
    it("トークンが見つからない場合、エラーをスロー", async () => {
      mockExchangeTokenRepository.findById.mockResolvedValue(null);

      const useCase = new SavePrivateCardUseCase(
        mockExchangeTokenRepository,
        mockCardRepository,
        mockSavedCardRepository
      );

      await expect(useCase.execute({userId: "user-123", tokenId: "invalid"})).rejects.toThrow(
        "Token not found"
      );
    });

    it("自分のトークンは使用できない", async () => {
      const userId = "user-123";
      const token: ExchangeToken = {
        tokenId: "token-123",
        ownerId: userId, // Same as userId
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
      };

      mockExchangeTokenRepository.findById.mockResolvedValue(token);

      const useCase = new SavePrivateCardUseCase(
        mockExchangeTokenRepository,
        mockCardRepository,
        mockSavedCardRepository
      );

      await expect(useCase.execute({userId, tokenId: "token-123"})).rejects.toThrow(
        "Cannot use your own token"
      );
    });

    it("使用済みトークンは使用できない", async () => {
      const token: ExchangeToken = {
        tokenId: "token-123",
        ownerId: "owner-456",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
        usedBy: "someone-else",
        usedAt: new Date(),
      };

      mockExchangeTokenRepository.findById.mockResolvedValue(token);

      const useCase = new SavePrivateCardUseCase(
        mockExchangeTokenRepository,
        mockCardRepository,
        mockSavedCardRepository
      );

      await expect(useCase.execute({userId: "user-123", tokenId: "token-123"})).rejects.toThrow(
        "Token has already been used"
      );
    });
  });
});
