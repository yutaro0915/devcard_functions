import {UpdateProfileUseCase} from "../../application/UpdateProfileUseCase";
import {IUserRepository} from "../../domain/IUserRepository";
import {IPublicCardRepository} from "../../domain/IPublicCardRepository";
import {User} from "../../domain/User";
import {PublicCard} from "../../domain/PublicCard";

const mockUserRepository: jest.Mocked<IUserRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
};

const mockPublicCardRepository: jest.Mocked<IPublicCardRepository> = {
  create: jest.fn(),
  findByUserId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe("UpdateProfileUseCase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update profile successfully", async () => {
    const userId = "test-user-123";

    const user: User = {
      userId,
      email: "test@example.com",
      displayName: "Old Name",
      photoURL: "https://old.example.com/photo.jpg",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const publicCard: PublicCard = {
      userId,
      displayName: "Old Name",
      photoURL: "https://old.example.com/photo.jpg",
      bio: "Old bio",
      connectedServices: {},
      theme: "default",
      updatedAt: new Date(),
    };

    mockUserRepository.findById.mockResolvedValue(user);
    mockPublicCardRepository.findByUserId.mockResolvedValue(publicCard);
    mockUserRepository.update.mockResolvedValue(undefined);
    mockPublicCardRepository.update.mockResolvedValue(undefined);

    const useCase = new UpdateProfileUseCase(
      mockUserRepository,
      mockPublicCardRepository
    );

    await useCase.execute({
      userId,
      displayName: "New Name",
      bio: "New bio",
      photoURL: "https://new.example.com/photo.jpg",
    });

    expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    expect(mockPublicCardRepository.findByUserId).toHaveBeenCalledWith(userId);
    expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
      displayName: "New Name",
      photoURL: "https://new.example.com/photo.jpg",
    });
    expect(mockPublicCardRepository.update).toHaveBeenCalledWith(userId, {
      displayName: "New Name",
      bio: "New bio",
      photoURL: "https://new.example.com/photo.jpg",
    });
  });

  it("should update only displayName", async () => {
    const userId = "test-user-123";

    const user: User = {
      userId,
      email: "test@example.com",
      displayName: "Old Name",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const publicCard: PublicCard = {
      userId,
      displayName: "Old Name",
      connectedServices: {},
      theme: "default",
      updatedAt: new Date(),
    };

    mockUserRepository.findById.mockResolvedValue(user);
    mockPublicCardRepository.findByUserId.mockResolvedValue(publicCard);
    mockUserRepository.update.mockResolvedValue(undefined);
    mockPublicCardRepository.update.mockResolvedValue(undefined);

    const useCase = new UpdateProfileUseCase(
      mockUserRepository,
      mockPublicCardRepository
    );

    await useCase.execute({
      userId,
      displayName: "New Name",
    });

    expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
      displayName: "New Name",
    });
    expect(mockPublicCardRepository.update).toHaveBeenCalledWith(userId, {
      displayName: "New Name",
    });
  });

  it("should update only bio (public card only)", async () => {
    const userId = "test-user-123";

    const user: User = {
      userId,
      email: "test@example.com",
      displayName: "Test User",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const publicCard: PublicCard = {
      userId,
      displayName: "Test User",
      connectedServices: {},
      theme: "default",
      updatedAt: new Date(),
    };

    mockUserRepository.findById.mockResolvedValue(user);
    mockPublicCardRepository.findByUserId.mockResolvedValue(publicCard);
    mockUserRepository.update.mockResolvedValue(undefined);
    mockPublicCardRepository.update.mockResolvedValue(undefined);

    const useCase = new UpdateProfileUseCase(
      mockUserRepository,
      mockPublicCardRepository
    );

    await useCase.execute({
      userId,
      bio: "New bio",
    });

    expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {});
    expect(mockPublicCardRepository.update).toHaveBeenCalledWith(userId, {
      bio: "New bio",
    });
  });

  it("should throw error if user not found", async () => {
    const userId = "nonexistent-user";

    mockUserRepository.findById.mockResolvedValue(null);

    const useCase = new UpdateProfileUseCase(
      mockUserRepository,
      mockPublicCardRepository
    );

    await expect(
      useCase.execute({
        userId,
        displayName: "New Name",
      })
    ).rejects.toThrow("User with ID nonexistent-user not found");

    expect(mockUserRepository.update).not.toHaveBeenCalled();
    expect(mockPublicCardRepository.update).not.toHaveBeenCalled();
  });

  it("should throw error if public card not found", async () => {
    const userId = "test-user-123";

    const user: User = {
      userId,
      email: "test@example.com",
      displayName: "Test User",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUserRepository.findById.mockResolvedValue(user);
    mockPublicCardRepository.findByUserId.mockResolvedValue(null);

    const useCase = new UpdateProfileUseCase(
      mockUserRepository,
      mockPublicCardRepository
    );

    await expect(
      useCase.execute({
        userId,
        displayName: "New Name",
      })
    ).rejects.toThrow("PublicCard for user test-user-123 not found");

    expect(mockUserRepository.update).not.toHaveBeenCalled();
    expect(mockPublicCardRepository.update).not.toHaveBeenCalled();
  });

  it("should throw error if no fields provided", async () => {
    const userId = "test-user-123";

    const useCase = new UpdateProfileUseCase(
      mockUserRepository,
      mockPublicCardRepository
    );

    await expect(
      useCase.execute({
        userId,
      })
    ).rejects.toThrow("At least one field must be provided for update");

    expect(mockUserRepository.findById).not.toHaveBeenCalled();
  });
});
