import {getStorage} from "firebase-admin/storage";
import {ImageValidationError} from "../domain/errors/DomainErrors";

/**
 * Storage service for handling image uploads to Firebase Storage
 */
export class StorageService {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];

  /**
   * Decode Base64 string to Buffer
   */
  static decodeBase64(base64String: string): Buffer {
    // Remove Data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    return Buffer.from(base64Data, "base64");
  }

  /**
   * Validate file size
   */
  static validateFileSize(sizeInBytes: number): void {
    if (sizeInBytes > this.MAX_FILE_SIZE) {
      throw new ImageValidationError(
        `Image size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }
  }

  /**
   * Validate content type
   */
  static validateContentType(contentType: string): void {
    if (!this.ALLOWED_CONTENT_TYPES.includes(contentType)) {
      throw new ImageValidationError(
        `Invalid content type: ${contentType}. Allowed types: ${this.ALLOWED_CONTENT_TYPES.join(", ")}`
      );
    }
  }

  /**
   * Get file extension from content type
   */
  static getFileExtension(contentType: string): string {
    const extensionMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    return extensionMap[contentType] || "bin";
  }

  /**
   * Upload image to Firebase Storage
   * @param userId - User ID for storage path
   * @param fileName - File name (e.g., "profile", "card_background")
   * @param imageData - Base64 encoded image data
   * @param contentType - MIME type (e.g., "image/jpeg")
   * @returns Download URL
   */
  async uploadImage(
    userId: string,
    fileName: string,
    imageData: string,
    contentType: string
  ): Promise<string> {
    // Validate content type
    StorageService.validateContentType(contentType);

    // Decode Base64
    const imageBuffer = StorageService.decodeBase64(imageData);

    // Validate file size
    StorageService.validateFileSize(imageBuffer.length);

    // Get file extension
    const extension = StorageService.getFileExtension(contentType);
    const filePath = `user_images/${userId}/${fileName}.${extension}`;

    // Upload to Firebase Storage
    const storage = getStorage();
    const bucket = storage.bucket();
    const file = bucket.file(filePath);

    await file.save(imageBuffer, {
      metadata: {
        contentType,
      },
    });

    // Try to make file public (may fail in Emulator, but that's OK)
    try {
      await file.makePublic();
    } catch (error) {
      // Ignore errors in Emulator environment
    }

    // Get public URL
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media`;

    return publicUrl;
  }
}
