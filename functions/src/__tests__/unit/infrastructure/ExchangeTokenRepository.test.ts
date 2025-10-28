import {ExchangeTokenRepository} from "../../../infrastructure/ExchangeTokenRepository";
import {Firestore} from "firebase-admin/firestore";

// Mock Firestore
const mockBatchCommit = jest.fn();
const mockBatchDelete = jest.fn();
const mockCollectionDocDelete = jest.fn();
const mockCollectionWhere = jest.fn();
const mockCollectionDoc = jest.fn();
const mockCollection = jest.fn();

const mockFirestore = {
  collection: mockCollection,
  batch: jest.fn(() => ({
    delete: mockBatchDelete,
    commit: mockBatchCommit,
  })),
} as unknown as Firestore;

describe("ExchangeTokenRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockReturnValue({
      doc: mockCollectionDoc,
      where: mockCollectionWhere,
    });
  });

  // Issue #50: Test delete() method
  describe("[Issue #50] delete() - 単一トークン削除", () => {
    it("指定されたtokenIdのトークンを削除する", async () => {
      const tokenId = "token-123";

      mockCollectionDoc.mockReturnValue({
        delete: mockCollectionDocDelete,
      });
      mockCollectionDocDelete.mockResolvedValue(undefined);

      const repository = new ExchangeTokenRepository(mockFirestore);
      await repository.delete(tokenId);

      expect(mockCollection).toHaveBeenCalledWith("exchange_tokens");
      expect(mockCollectionDoc).toHaveBeenCalledWith(tokenId);
      expect(mockCollectionDocDelete).toHaveBeenCalled();
    });

    it("存在しないトークンを削除してもエラーにならない", async () => {
      const tokenId = "non-existent-token";

      mockCollectionDoc.mockReturnValue({
        delete: mockCollectionDocDelete,
      });
      mockCollectionDocDelete.mockResolvedValue(undefined); // Firestore delete() doesn't throw on missing docs

      const repository = new ExchangeTokenRepository(mockFirestore);
      await expect(repository.delete(tokenId)).resolves.not.toThrow();
    });
  });

  // Issue #50: Test deleteUnusedByOwnerId() method
  describe("[Issue #50] deleteUnusedByOwnerId() - 未使用トークン一括削除", () => {
    it("指定されたownerIdの未使用トークンのみ削除する", async () => {
      const ownerId = "owner-123";

      const mockDoc1 = {ref: {path: "exchange_tokens/token-1"}};
      const mockDoc2 = {ref: {path: "exchange_tokens/token-2"}};
      const mockQuerySnapshot = {
        empty: false,
        docs: [mockDoc1, mockDoc2],
      };

      const mockWhereUsedBy = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockQuerySnapshot),
      });

      mockCollectionWhere.mockReturnValue({
        where: mockWhereUsedBy,
      });

      const repository = new ExchangeTokenRepository(mockFirestore);
      await repository.deleteUnusedByOwnerId(ownerId);

      // Verify query
      expect(mockCollection).toHaveBeenCalledWith("exchange_tokens");
      expect(mockCollectionWhere).toHaveBeenCalledWith("ownerId", "==", ownerId);
      expect(mockWhereUsedBy).toHaveBeenCalledWith("usedBy", "==", null);

      // Verify batch delete
      expect(mockBatchDelete).toHaveBeenCalledTimes(2);
      expect(mockBatchDelete).toHaveBeenCalledWith(mockDoc1.ref);
      expect(mockBatchDelete).toHaveBeenCalledWith(mockDoc2.ref);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it("未使用トークンが0件の場合、何もせず正常終了", async () => {
      const ownerId = "owner-with-no-tokens";

      const mockQuerySnapshot = {
        empty: true,
        docs: [],
      };

      const mockWhereUsedBy = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockQuerySnapshot),
      });

      mockCollectionWhere.mockReturnValue({
        where: mockWhereUsedBy,
      });

      const repository = new ExchangeTokenRepository(mockFirestore);
      await repository.deleteUnusedByOwnerId(ownerId);

      // Verify query was executed
      expect(mockCollectionWhere).toHaveBeenCalledWith("ownerId", "==", ownerId);

      // Verify batch was NOT created (early return on empty)
      expect(mockBatchDelete).not.toHaveBeenCalled();
      expect(mockBatchCommit).not.toHaveBeenCalled();
    });

    it("使用済みトークンは削除されない（usedBy=null のみ削除）", async () => {
      const ownerId = "owner-123";

      // This test verifies the query filters correctly
      // In actual Firestore, usedBy != null documents won't be returned
      const mockQuerySnapshot = {
        empty: true,
        docs: [],
      };

      const mockWhereUsedBy = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockQuerySnapshot),
      });

      mockCollectionWhere.mockReturnValue({
        where: mockWhereUsedBy,
      });

      const repository = new ExchangeTokenRepository(mockFirestore);
      await repository.deleteUnusedByOwnerId(ownerId);

      // Verify the where clause filters by usedBy == null
      expect(mockWhereUsedBy).toHaveBeenCalledWith("usedBy", "==", null);
    });
  });

  describe("既存メソッドの動作確認", () => {
    it("deleteExpired() が期限切れトークンを削除する", async () => {
      const mockDoc1 = {ref: {path: "exchange_tokens/expired-1"}};
      const mockDoc2 = {ref: {path: "exchange_tokens/expired-2"}};
      const mockQuerySnapshot = {
        empty: false,
        docs: [mockDoc1, mockDoc2],
      };

      mockCollectionWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockQuerySnapshot),
      });

      const repository = new ExchangeTokenRepository(mockFirestore);
      await repository.deleteExpired();

      expect(mockCollectionWhere).toHaveBeenCalledWith("expiresAt", "<", expect.any(Date));
      expect(mockBatchDelete).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalled();
    });
  });
});
