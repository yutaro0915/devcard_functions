import {
  UpdateProfileUseCase,
  IProfileUpdateTransaction,
} from "../../application/UpdateProfileUseCase";

const mockTransaction: jest.Mocked<IProfileUpdateTransaction> = {
  execute: jest.fn(),
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

    mockTransaction.execute.mockResolvedValue(undefined);

    const useCase = new UpdateProfileUseCase(mockTransaction);
    await useCase.execute(input);

    expect(mockTransaction.execute).toHaveBeenCalledWith(
      "user-123",
      {
        displayName: "New Name",
        photoURL: "https://example.com/new.jpg",
      },
      {
        displayName: "New Name",
        bio: "New bio",
        photoURL: "https://example.com/new.jpg",
      }
    );
  });

  it("should update displayName only", async () => {
    const input = {
      userId: "user-123",
      displayName: "New Name Only",
    };

    mockTransaction.execute.mockResolvedValue(undefined);

    const useCase = new UpdateProfileUseCase(mockTransaction);
    await useCase.execute(input);

    expect(mockTransaction.execute).toHaveBeenCalledWith(
      "user-123",
      {
        displayName: "New Name Only",
      },
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

    mockTransaction.execute.mockResolvedValue(undefined);

    const useCase = new UpdateProfileUseCase(mockTransaction);
    await useCase.execute(input);

    expect(mockTransaction.execute).toHaveBeenCalledWith(
      "user-123",
      {},
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

    mockTransaction.execute.mockResolvedValue(undefined);

    const useCase = new UpdateProfileUseCase(mockTransaction);
    await useCase.execute(input);

    expect(mockTransaction.execute).toHaveBeenCalledWith(
      "user-123",
      {
        photoURL: "https://example.com/new-photo.jpg",
      },
      {
        photoURL: "https://example.com/new-photo.jpg",
      }
    );
  });

  it("should throw error if no fields provided", async () => {
    const input = {
      userId: "user-123",
    };

    const useCase = new UpdateProfileUseCase(mockTransaction);
    await expect(useCase.execute(input)).rejects.toThrow(
      "At least one field must be provided for update"
    );

    expect(mockTransaction.execute).not.toHaveBeenCalled();
  });

  it("should throw error if user not found", async () => {
    const input = {
      userId: "nonexistent-user",
      displayName: "New Name",
    };

    mockTransaction.execute.mockRejectedValue(
      new Error("User with ID nonexistent-user not found")
    );

    const useCase = new UpdateProfileUseCase(mockTransaction);
    await expect(useCase.execute(input)).rejects.toThrow(
      "User with ID nonexistent-user not found"
    );
  });

  it("should throw error if public card not found", async () => {
    const input = {
      userId: "user-123",
      displayName: "New Name",
    };

    mockTransaction.execute.mockRejectedValue(
      new Error("PublicCard for user user-123 not found")
    );

    const useCase = new UpdateProfileUseCase(mockTransaction);
    await expect(useCase.execute(input)).rejects.toThrow(
      "PublicCard for user user-123 not found"
    );
  });

  it("should allow empty string for bio", async () => {
    const input = {
      userId: "user-123",
      bio: "",
    };

    mockTransaction.execute.mockResolvedValue(undefined);

    const useCase = new UpdateProfileUseCase(mockTransaction);
    await useCase.execute(input);

    expect(mockTransaction.execute).toHaveBeenCalledWith(
      "user-123",
      {},
      {
        bio: "",
      }
    );
  });
});
