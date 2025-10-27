import {StorageService} from "../../../infrastructure/StorageService";
import {ImageValidationError} from "../../../domain/errors/DomainErrors";

describe("StorageService Unit Tests", () => {
  describe("validateImageData", () => {
    it("StorageService (Unit): Base64デコードが正常に動作する", () => {
      const validBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const buffer = StorageService.decodeBase64(validBase64);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("StorageService (Unit): ファイルサイズ検証が5MB境界で正しく動作する", () => {
      const maxSizeBytes = 5 * 1024 * 1024; // 5MB

      // Exactly 5MB - should pass
      const validSize = maxSizeBytes;
      expect(() => {
        StorageService.validateFileSize(validSize);
      }).not.toThrow();

      // 5MB + 1 byte - should fail
      const invalidSize = maxSizeBytes + 1;
      expect(() => {
        StorageService.validateFileSize(invalidSize);
      }).toThrow(ImageValidationError);
    });

    it("StorageService (Unit): Content-Type検証が許可リストと一致する", () => {
      // Valid content types
      expect(() => {
        StorageService.validateContentType("image/jpeg");
      }).not.toThrow();

      expect(() => {
        StorageService.validateContentType("image/png");
      }).not.toThrow();

      expect(() => {
        StorageService.validateContentType("image/webp");
      }).not.toThrow();

      // Invalid content types
      expect(() => {
        StorageService.validateContentType("image/svg+xml");
      }).toThrow(ImageValidationError);

      expect(() => {
        StorageService.validateContentType("image/gif");
      }).toThrow(ImageValidationError);

      expect(() => {
        StorageService.validateContentType("application/pdf");
      }).toThrow(ImageValidationError);
    });
  });

  describe("getFileExtension", () => {
    it("正しい拡張子を返す", () => {
      expect(StorageService.getFileExtension("image/jpeg")).toBe("jpg");
      expect(StorageService.getFileExtension("image/png")).toBe("png");
      expect(StorageService.getFileExtension("image/webp")).toBe("webp");
    });

    it("不明なContent-Typeの場合はbin", () => {
      expect(StorageService.getFileExtension("unknown/type")).toBe("bin");
    });
  });
});
