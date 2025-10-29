import {UpdateProfileUseCase} from "../../../application/UpdateProfileUseCase";
import {ICardRepository} from "../../../domain/ICardRepository";
import {IUserRepository} from "../../../domain/IUserRepository";

const mockCardRepository: jest.Mocked<ICardRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  exists: jest.fn(),
  delete: jest.fn(),
};

const mockUserRepository: jest.Mocked<IUserRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
};

describe("UpdateProfileUseCase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update all fields successfully", async () => {
    const input = {
      userId: "user-123",
      displayName: "New Name",
      bio: "New bio",
      photoURL: "https://example.com/new.jpg",
    };

    mockCardRepository.update.mockResolvedValue(undefined);
    mockUserRepository.update.mockResolvedValue(undefined);

    const useCase = new UpdateProfileUseCase(mockCardRepository, mockUserRepository);
    await useCase.execute(input);

    expect(mockCardRepository.update).toHaveBeenCalledWith("user-123", {
      displayName: "New Name",
      bio: "New bio",
      photoURL: "https://example.com/new.jpg",
    });

    expect(mockUserRepository.update).toHaveBeenCalledWith("user-123", {
      displayName: "New Name",
      photoURL: "https://example.com/new.jpg",
    });
  });

  it("should update displayName only", async () => {
    const input = {
      userId: "user-123",
      displayName: "New Name Only",
    };

    mockCardRepository.update.mockResolvedValue(undefined);
    mockUserRepository.update.mockResolvedValue(undefined);

    const useCase = new UpdateProfileUseCase(mockCardRepository, mockUserRepository);
    await useCase.execute(input);

    expect(mockCardRepository.update).toHaveBeenCalledWith("user-123", {
      displayName: "New Name Only",
      bio: undefined,
      photoURL: undefined,
    });

    expect(mockUserRepository.update).toHaveBeenCalledWith("user-123", {
      displayName: "New Name Only",
      photoURL: undefined,
    });
  });

  it("should update bio only", async () => {
    const input = {
      userId: "user-123",
      bio: "New bio only",
    };

    mockCardRepository.update.mockResolvedValue(undefined);
    mockUserRepository.update.mockResolvedValue(undefined);

    const useCase = new UpdateProfileUseCase(mockCardRepository, mockUserRepository);
    await useCase.execute(input);

    expect(mockCardRepository.update).toHaveBeenCalledWith("user-123", {
      displayName: undefined,
      bio: "New bio only",
      photoURL: undefined,
    });

    // bio only doesn't trigger user update
    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });

  it("should update photoURL only", async () => {
    const input = {
      userId: "user-123",
      photoURL: "https://example.com/new-photo.jpg",
    };

    mockCardRepository.update.mockResolvedValue(undefined);
    mockUserRepository.update.mockResolvedValue(undefined);

    const useCase = new UpdateProfileUseCase(mockCardRepository, mockUserRepository);
    await useCase.execute(input);

    expect(mockCardRepository.update).toHaveBeenCalledWith("user-123", {
      displayName: undefined,
      bio: undefined,
      photoURL: "https://example.com/new-photo.jpg",
    });

    expect(mockUserRepository.update).toHaveBeenCalledWith("user-123", {
      displayName: undefined,
      photoURL: "https://example.com/new-photo.jpg",
    });
  });

  it("should handle empty update gracefully", async () => {
    const input = {
      userId: "user-123",
    };

    mockCardRepository.update.mockResolvedValue(undefined);

    const useCase = new UpdateProfileUseCase(mockCardRepository, mockUserRepository);
    await useCase.execute(input);

    expect(mockCardRepository.update).toHaveBeenCalledWith("user-123", {
      displayName: undefined,
      bio: undefined,
      photoURL: undefined,
    });

    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });

  it("should allow empty string for bio", async () => {
    const input = {
      userId: "user-123",
      bio: "",
    };

    mockCardRepository.update.mockResolvedValue(undefined);

    const useCase = new UpdateProfileUseCase(mockCardRepository, mockUserRepository);
    await useCase.execute(input);

    expect(mockCardRepository.update).toHaveBeenCalledWith("user-123", {
      displayName: undefined,
      bio: "",
      photoURL: undefined,
    });

    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });
});
