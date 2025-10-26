import {SanitizeService} from "../../../application/SanitizeService";

describe("SanitizeService", () => {
  let sanitizeService: SanitizeService;

  beforeEach(() => {
    sanitizeService = new SanitizeService();
  });

  describe("sanitizeDisplayName", () => {
    it("should keep alphanumeric characters only", () => {
      const result = sanitizeService.sanitizeDisplayName("test123");
      expect(result).toBe("test123");
    });

    it("should remove special characters from email prefix", () => {
      const result = sanitizeService.sanitizeDisplayName("user.name+tag");
      expect(result).toBe("usernametag");
    });

    it("should handle complex email prefixes (user+tag@example.com)", () => {
      const emailPrefix = "user+tag@example.com".split('@')[0];
      const result = sanitizeService.sanitizeDisplayName(emailPrefix);
      expect(result).toBe("usertag");
    });

    it("should handle dots and hyphens (user.name-test@example.com)", () => {
      const emailPrefix = "user.name-test@example.com".split('@')[0];
      const result = sanitizeService.sanitizeDisplayName(emailPrefix);
      expect(result).toBe("usernametest");
    });

    it("should handle Japanese email prefixes", () => {
      const result = sanitizeService.sanitizeDisplayName("太郎.tanaka");
      expect(result).toBe("tanaka");
    });

    it("should fallback to 'user' if all characters are removed", () => {
      const result = sanitizeService.sanitizeDisplayName("+++...---");
      expect(result).toBe("user");
    });

    it("should limit to 100 characters", () => {
      const longString = "a".repeat(150);
      const result = sanitizeService.sanitizeDisplayName(longString);
      expect(result).toBe("a".repeat(100));
    });

    it("should handle empty string", () => {
      const result = sanitizeService.sanitizeDisplayName("");
      expect(result).toBe("user");
    });

    it("should handle mixed case", () => {
      const result = sanitizeService.sanitizeDisplayName("UserName123");
      expect(result).toBe("UserName123");
    });
  });
});
