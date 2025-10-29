import {UpdateCardUseCase, UpdateCardInput} from "../../../application/UpdateCardUseCase";
import {ICardRepository} from "../../../domain/ICardRepository";
import {IUserRepository} from "../../../domain/IUserRepository";

describe("UpdateCardUseCase", () => {
  let mockCardRepository: jest.Mocked<ICardRepository>;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let useCase: UpdateCardUseCase;

  beforeEach(() => {
    mockCardRepository = {
      update: jest.fn(),
    } as unknown as jest.Mocked<ICardRepository>;

    mockUserRepository = {
      update: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    useCase = new UpdateCardUseCase(mockCardRepository, mockUserRepository);
  });

  it("should update card with profile fields", async () => {
    const input: UpdateCardInput = {
      userId: "user123",
      displayName: "New Name",
      bio: "New bio",
      photoURL: "https://example.com/photo.jpg",
    };

    await useCase.execute(input);

    expect(mockCardRepository.update).toHaveBeenCalledWith("user123", {
      displayName: "New Name",
      bio: "New bio",
      photoURL: "https://example.com/photo.jpg",
    });
    expect(mockUserRepository.update).toHaveBeenCalledWith("user123", {
      displayName: "New Name",
      photoURL: "https://example.com/photo.jpg",
    });
  });

  it("should update card with contact fields", async () => {
    const input: UpdateCardInput = {
      userId: "user123",
      email: "test@example.com",
      phoneNumber: "+81-90-1234-5678",
      line: "line_id",
      discord: "discord#1234",
    };

    await useCase.execute(input);

    expect(mockCardRepository.update).toHaveBeenCalledWith("user123", {
      displayName: undefined,
      photoURL: undefined,
      email: "test@example.com",
      phoneNumber: "+81-90-1234-5678",
      line: "line_id",
      discord: "discord#1234",
    });
    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });

  it("should update card with SNS fields", async () => {
    const input: UpdateCardInput = {
      userId: "user123",
      github: "octocat",
      x: "twitter_user",
      linkedin: "linkedin-user",
      zenn: "zenn_user",
    };

    await useCase.execute(input);

    expect(mockCardRepository.update).toHaveBeenCalledWith("user123", {
      displayName: undefined,
      photoURL: undefined,
      github: "octocat",
      x: "twitter_user",
      linkedin: "linkedin-user",
      zenn: "zenn_user",
    });
    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });

  it("should update card with all fields", async () => {
    const input: UpdateCardInput = {
      userId: "user123",
      displayName: "Full Update",
      bio: "Complete profile",
      photoURL: "https://example.com/photo.jpg",
      email: "full@example.com",
      phoneNumber: "+81-90-1234-5678",
      line: "line_id",
      discord: "discord#1234",
      github: "octocat",
      x: "twitter_user",
      linkedin: "linkedin-user",
      website: "https://example.com",
    };

    await useCase.execute(input);

    expect(mockCardRepository.update).toHaveBeenCalledWith("user123", {
      displayName: "Full Update",
      photoURL: "https://example.com/photo.jpg",
      bio: "Complete profile",
      email: "full@example.com",
      phoneNumber: "+81-90-1234-5678",
      line: "line_id",
      discord: "discord#1234",
      github: "octocat",
      x: "twitter_user",
      linkedin: "linkedin-user",
      website: "https://example.com",
    });
    expect(mockUserRepository.update).toHaveBeenCalledWith("user123", {
      displayName: "Full Update",
      photoURL: "https://example.com/photo.jpg",
    });
  });

  it("should not update user if only non-profile fields are provided", async () => {
    const input: UpdateCardInput = {
      userId: "user123",
      bio: "Only bio",
      email: "test@example.com",
    };

    await useCase.execute(input);

    expect(mockCardRepository.update).toHaveBeenCalled();
    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });
});
