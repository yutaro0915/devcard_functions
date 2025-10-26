import {CreateUserUseCase} from "../../../application/CreateUserUseCase";
import {IUserRepository} from "../../../domain/IUserRepository";
import {User} from "../../../domain/User";

// モック: IUserRepositoryの偽物を作る
// 実際のFirestoreにアクセスせず、メモリ上で動作する
const mockUserRepository: jest.Mocked<IUserRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
};

describe("CreateUserUseCase", () => {
  // 各テストの前にモックをリセット
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // テスト1: 正常系 - ユーザーを作成できる
  it("should create a new user successfully", async () => {
    // Arrange（準備）: テストデータを用意
    const input = {
      userId: "test-user-123",
      email: "test@example.com",
      displayName: "Test User",
      photoURL: "https://example.com/photo.jpg",
    };

    const expectedUser: User = {
      ...input,
      githubAccessToken: undefined,
      xAccessToken: undefined,
      qiitaAccessToken: undefined,
      customCss: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // モックの動作を設定
    mockUserRepository.findById.mockResolvedValue(null); // ユーザーが存在しない
    mockUserRepository.create.mockResolvedValue(expectedUser); // 作成成功

    // Act（実行）: UseCaseを実行
    const useCase = new CreateUserUseCase(mockUserRepository);
    const result = await useCase.execute(input);

    // Assert（検証）: 期待通りの結果か確認
    expect(result).toEqual(expectedUser);
    expect(mockUserRepository.findById).toHaveBeenCalledWith(input.userId);
    expect(mockUserRepository.create).toHaveBeenCalledWith(input);
  });

  // テスト2: 異常系 - 既存ユーザーがいる場合はエラー
  it("should throw error if user already exists", async () => {
    // Arrange
    const input = {
      userId: "existing-user",
      email: "existing@example.com",
      displayName: "Existing User",
    };

    const existingUser: User = {
      ...input,
      githubAccessToken: undefined,
      xAccessToken: undefined,
      qiitaAccessToken: undefined,
      customCss: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // モック: ユーザーが既に存在する
    mockUserRepository.findById.mockResolvedValue(existingUser);

    // Act & Assert
    const useCase = new CreateUserUseCase(mockUserRepository);
    await expect(useCase.execute(input)).rejects.toThrow(
      "User with ID existing-user already exists"
    );

    // createは呼ばれないはず
    expect(mockUserRepository.create).not.toHaveBeenCalled();
  });
});
