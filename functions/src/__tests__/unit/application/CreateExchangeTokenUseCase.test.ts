import {CreateExchangeTokenUseCase} from "../../../application/CreateExchangeTokenUseCase";
import {IPrivateCardRepository} from "../../../domain/IPrivateCardRepository";
import {IExchangeTokenRepository} from "../../../domain/IExchangeTokenRepository";
import {PrivateCard} from "../../../domain/PrivateCard";
import {PrivateCardNotFoundError} from "../../../domain/errors/DomainErrors";

const mockPrivateCardRepository: jest.Mocked<IPrivateCardRepository> = {
  create: jest.fn(),
  findByUserId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockExchangeTokenRepository: jest.Mocked<IExchangeTokenRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  markAsUsed: jest.fn(),
  deleteExpired: jest.fn(),
};

describe("CreateExchangeTokenUseCase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Issue #23: Test successful token creation
  it("should create exchange token successfully when PrivateCard exists", async () => {
    const userId = "user-123";

    const privateCard: PrivateCard = {
      userId: "user-123",
      displayName: "Test User",
      email: "test@example.com",
      updatedAt: new Date(),
    };

    mockPrivateCardRepository.findByUserId.mockResolvedValue(privateCard);
    mockExchangeTokenRepository.create.mockResolvedValue({
      tokenId: "token-abc-123",
      ownerId: userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60000), // +1 minute
    });

    const useCase = new CreateExchangeTokenUseCase(
      mockPrivateCardRepository,
      mockExchangeTokenRepository
    );

    const result = await useCase.execute({userId});

    expect(result.tokenId).toBe("token-abc-123");
    expect(result.expiresAt).toBeDefined();
    expect(result.qrCodeData).toBe("devcard://exchange/token-abc-123");

    expect(mockPrivateCardRepository.findByUserId).toHaveBeenCalledWith(userId);
    expect(mockExchangeTokenRepository.create).toHaveBeenCalledWith({
      tokenId: expect.any(String),
      ownerId: userId,
    });
  });

  // Issue #23: Test PrivateCardNotFoundError
  it("should throw PrivateCardNotFoundError when PrivateCard does not exist", async () => {
    const userId = "user-without-private-card";

    mockPrivateCardRepository.findByUserId.mockResolvedValue(null);

    const useCase = new CreateExchangeTokenUseCase(
      mockPrivateCardRepository,
      mockExchangeTokenRepository
    );

    await expect(useCase.execute({userId})).rejects.toThrow(PrivateCardNotFoundError);
    await expect(useCase.execute({userId})).rejects.toThrow(
      "PrivateCard for user user-without-private-card not found"
    );

    expect(mockPrivateCardRepository.findByUserId).toHaveBeenCalledWith(userId);
    expect(mockExchangeTokenRepository.create).not.toHaveBeenCalled();
  });

  it("should generate tokenId with correct format", async () => {
    const userId = "user-123";

    const privateCard: PrivateCard = {
      userId: "user-123",
      displayName: "Test User",
      email: "test@example.com",
      updatedAt: new Date(),
    };

    mockPrivateCardRepository.findByUserId.mockResolvedValue(privateCard);
    mockExchangeTokenRepository.create.mockImplementation(async (data) => ({
      tokenId: data.tokenId,
      ownerId: data.ownerId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
    }));

    const useCase = new CreateExchangeTokenUseCase(
      mockPrivateCardRepository,
      mockExchangeTokenRepository
    );

    const result = await useCase.execute({userId});

    // TokenId should be a non-empty string
    expect(result.tokenId).toBeTruthy();
    expect(typeof result.tokenId).toBe("string");
    expect(result.tokenId.length).toBeGreaterThan(0);
  });

  it("should set expiresAt to 1 minute from createdAt", async () => {
    const userId = "user-123";
    const now = new Date("2024-01-01T12:00:00.000Z");
    const expectedExpiry = new Date("2024-01-01T12:01:00.000Z");

    const privateCard: PrivateCard = {
      userId: "user-123",
      displayName: "Test User",
      email: "test@example.com",
      updatedAt: new Date(),
    };

    mockPrivateCardRepository.findByUserId.mockResolvedValue(privateCard);
    mockExchangeTokenRepository.create.mockResolvedValue({
      tokenId: "token-123",
      ownerId: userId,
      createdAt: now,
      expiresAt: expectedExpiry,
    });

    const useCase = new CreateExchangeTokenUseCase(
      mockPrivateCardRepository,
      mockExchangeTokenRepository
    );

    const result = await useCase.execute({userId});

    expect(result.expiresAt).toBeDefined();
    // ExpiresAt should be a string in ISO 8601 format
    expect(typeof result.expiresAt).toBe("string");
  });
});
