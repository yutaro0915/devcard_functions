import {GitHubApiClient} from "../../../infrastructure/GitHubApiClient";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("GitHubApiClient", () => {
  let client: GitHubApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new GitHubApiClient();
  });

  describe("fetchUserInfo", () => {
    it("should fetch GitHub user info successfully", async () => {
      const mockResponse = {
        data: {
          login: "testuser",
          name: "Test User",
          avatar_url: "https://avatars.githubusercontent.com/u/123",
          bio: "Software Engineer",
          html_url: "https://github.com/testuser",
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await client.fetchUserInfo("valid_token_123");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        username: "testuser",
        name: "Test User",
        avatarUrl: "https://avatars.githubusercontent.com/u/123",
        bio: "Software Engineer",
        profileUrl: "https://github.com/testuser",
      });
      expect(result.error).toBeUndefined();

      expect(mockedAxios.get).toHaveBeenCalledWith("https://api.github.com/user", {
        headers: {
          Authorization: "Bearer valid_token_123",
          Accept: "application/vnd.github.v3+json",
        },
      });
    });

    it("should handle GitHub user with missing optional fields", async () => {
      const mockResponse = {
        data: {
          login: "testuser",
          avatar_url: "https://avatars.githubusercontent.com/u/123",
          html_url: "https://github.com/testuser",
          // name and bio are missing
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await client.fetchUserInfo("valid_token_123");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        username: "testuser",
        avatarUrl: "https://avatars.githubusercontent.com/u/123",
        profileUrl: "https://github.com/testuser",
        // name and bio should be undefined
      });
    });

    it("should return token-expired error when GitHub returns 401", async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          status: 401,
        },
      });

      const result = await client.fetchUserInfo("expired_token");

      expect(result.success).toBe(false);
      expect(result.error).toBe("token-expired");
      expect(result.data).toBeUndefined();
    });

    it("should return api-error when GitHub returns 5xx", async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          status: 500,
        },
      });

      const result = await client.fetchUserInfo("valid_token");

      expect(result.success).toBe(false);
      expect(result.error).toBe("api-error");
      expect(result.data).toBeUndefined();
    });

    it("should return api-error when GitHub returns 404", async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          status: 404,
        },
      });

      const result = await client.fetchUserInfo("valid_token");

      expect(result.success).toBe(false);
      expect(result.error).toBe("api-error");
    });

    it("should return api-error when network error occurs", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network Error"));

      const result = await client.fetchUserInfo("valid_token");

      expect(result.success).toBe(false);
      expect(result.error).toBe("api-error");
    });

    it("should return api-error when response is missing required fields", async () => {
      const mockResponse = {
        data: {
          // Missing login, avatar_url, html_url
          name: "Test User",
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await client.fetchUserInfo("valid_token");

      expect(result.success).toBe(false);
      expect(result.error).toBe("api-error");
    });
  });

  describe("toConnectedService", () => {
    it("should convert GitHub user info to ConnectedService format", () => {
      const userInfo = {
        username: "testuser",
        name: "Test User",
        avatarUrl: "https://avatars.githubusercontent.com/u/123",
        bio: "Software Engineer",
        profileUrl: "https://github.com/testuser",
      };

      const result = client.toConnectedService(userInfo);

      expect(result).toEqual({
        serviceName: "github",
        username: "testuser",
        profileUrl: "https://github.com/testuser",
        avatarUrl: "https://avatars.githubusercontent.com/u/123",
        bio: "Software Engineer",
        stats: {
          name: "Test User",
        },
      });
    });

    it("should handle missing optional fields", () => {
      const userInfo = {
        username: "testuser",
        avatarUrl: "https://avatars.githubusercontent.com/u/123",
        profileUrl: "https://github.com/testuser",
      };

      const result = client.toConnectedService(userInfo);

      expect(result).toEqual({
        serviceName: "github",
        username: "testuser",
        profileUrl: "https://github.com/testuser",
        avatarUrl: "https://avatars.githubusercontent.com/u/123",
      });
    });

    it("should include name in stats when present", () => {
      const userInfo = {
        username: "testuser",
        name: "Real Name",
        avatarUrl: "https://avatars.githubusercontent.com/u/123",
        profileUrl: "https://github.com/testuser",
      };

      const result = client.toConnectedService(userInfo);

      expect(result.stats).toEqual({
        name: "Real Name",
      });
    });
  });
});
