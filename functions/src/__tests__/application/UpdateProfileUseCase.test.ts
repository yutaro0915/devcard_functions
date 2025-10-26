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

  const mockUser: User = {
    userId: "user-123",
    email: "test@example.com",
    displayName: "Old Name",
    photoURL: "https://example.com/old.jpg",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPublicCard: PublicCard = {
    userId: "user-123",
    displayName: "Old Name",
    photoURL: "https://example.com/old.jpg",
    bio: "Old bio",
    connectedServices: {},
    theme: "default",
    updatedAt: new Date(),
  };

  it("should update all fields successfully", async () => {
    const input = {
      userId: "user-123",
      displayName: "New Name",
      bio: "New bio",
      photoURL: "https://example.com/new.jpg",
    };

    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockPublicCardRepository.findByUserId.mockResolvedValue(mockPublicCard);
    mockUserRepository.update.mockResolvedValue(undefined);
    mockPublicCardRepository.update.mockResolvedValue(undefined);

    const useCase = new UpdateProfileUseCase(
      mockUserRepository,
      mockPublicCardRepository
    );
    await useCase.execute(input);

    expect(mockUserRepository.findById).toHaveBeenCalledWith(
      "user-123"
    );
    expect(mockPublicCardRepository.findByUserId).toHaveBeenCalledWith(
      "user-123"
    );
    expect(mockUserRepository.update).toHaveBeenCalledWith("user-123", {
      displayName: "New Name",
      photoURL: "https://example.com/new.jpg",
    });
    expect(mockPublicCardRepository.update).toHaveBeenCalledWith("user-123", {
      displayName: "New Name",
      bio: "New bio",
      photoURL: "https://example.com/new.jpg",
    });
  });

  it("should update displayName only", async () => {
    const input = {
      userId: "user-123",
      displayName: "New Name Only",
    };

    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockPublicCardRepository.findByUserId.mockResolvedValue(mockPublicCard);
    mockUserRepository.update.mockResolvedValue(undefined);
    mockPublicCardRepository.update.mockResolvedValue(undefined);

    const useCase = new UpdateProfileUseCase(
      mockUserRepository,
      mockPublicCardRepository
    );
    await useCase.execute(input);

    expect(mockUserRepository.update).toHaveBeenCalledWith(
      "user-123",
      {
        displayName: "New Name Only",
      }
    );
    expect(mockPublicCardRepository.update).toHaveBeenCalledWith(
      "user-123",
      {
        displayName: "New Name Only",
      }
    );
  });

  it("should update bio only", async () => {
    const input = {
      userId: "user-123",
      bio: "New bio only",
    };

    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockPublicCardRepository.findByUserId.mockResolvedValue(mockPublicCard);
    mockUserRepository.update.mockResolvedValue(undefined);
    mockPublicCardRepository.update.mockResolvedValue(undefined);

    const useCase = new UpdateProfileUseCase(
      mockUserRepository,
      mockPublicCardRepository
    );
    await useCase.execute(input);

    expect(mockUserRepository.update).not.toHaveBeenCalled();
    expect(mockPublicCardRepository.update).toHaveBeenCalledWith(
      "user-123",
      {
        bio: "New bio only",
      }
    );
  });

  it("should update photoURL only", async () => {
    const input = {
      userId: "user-123",
      photoURL: "https://example.com/new-photo.jpg",
    };

    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockPublicCardRepository.findByUserId.mockResolvedValue(mockPublicCard);
    mockUserRepository.update.mockResolvedValue(undefined);
    mockPublicCardRepository.update.mockResolvedValue(undefined);

    const useCase = new UpdateProfileUseCase(
      mockUserRepository,
      mockPublicCardRepository
    );
    await useCase.execute(input);

    expect(mockUserRepository.update).toHaveBeenCalledWith(
      "user-123",
      {
        photoURL: "https://example.com/new-photo.jpg",
      }
    );
    expect(mockPublicCardRepository.update).toHaveBeenCalledWith(
      "user-123",
      {
        photoURL: "https://example.com/new-photo.jpg",
      }
    );
  });

  it("should throw error if no fields provided", async () => {
    const input = {
      userId: "user-123",
    };

    const useCase = new UpdateProfileUseCase(
      mockUserRepository,
      mockPublicCardRepository
    );
    await expect(useCase.execute(input)).rejects.toThrow(
      "At least one field must be provided for update"
    );

    expect(mockUserRepository.update).not.toHaveBeenCalled();
    expect(mockPublicCardRepository.update).not.toHaveBeenCalled();
  });

  it("should throw error if user not found", async () => {
    const input = {
      userId: "nonexistent-user",
      displayName: "New Name",
    };

    mockUserRepository.findById.mockResolvedValue(null);

    const useCase = new UpdateProfileUseCase(
      mockUserRepository,
      mockPublicCardRepository
    );
    await expect(useCase.execute(input)).rejects.toThrow(
      "User with ID nonexistent-user not found"
    );

    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });

  it("should throw error if public card not found", async () => {
    const input = {
      userId: "user-123",
      displayName: "New Name",
    };

    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockPublicCardRepository.findByUserId.mockResolvedValue(null);

    const useCase = new UpdateProfileUseCase(
      mockUserRepository,
      mockPublicCardRepository
    );
    await expect(useCase.execute(input)).rejects.toThrow(
      "PublicCard for user user-123 not found"
    );

    expect(mockUserRepository.update).not.toHaveBeenCalled();
    expect(mockPublicCardRepository.update).not.toHaveBeenCalled();
  });
});
