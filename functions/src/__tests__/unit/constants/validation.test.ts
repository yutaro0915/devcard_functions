import {isValidTwitterHandle, normalizeTwitterHandle} from "../../../constants/validation";

describe("Twitter Handle Validation", () => {
  describe("normalizeTwitterHandle", () => {
    it("removes @ prefix", () => {
      expect(normalizeTwitterHandle("@username")).toBe("username");
    });

    it("keeps handle without @", () => {
      expect(normalizeTwitterHandle("username")).toBe("username");
    });
  });

  describe("isValidTwitterHandle", () => {
    it("accepts valid handles without @", () => {
      expect(isValidTwitterHandle("username")).toBe(true);
      expect(isValidTwitterHandle("user_name")).toBe(true);
      expect(isValidTwitterHandle("user123")).toBe(true);
    });

    it("accepts valid handles with @", () => {
      expect(isValidTwitterHandle("@username")).toBe(true);
      expect(isValidTwitterHandle("@user_name")).toBe(true);
      expect(isValidTwitterHandle("@user123")).toBe(true);
    });

    it("rejects handles over 15 characters", () => {
      expect(isValidTwitterHandle("a".repeat(16))).toBe(false);
      expect(isValidTwitterHandle("@" + "a".repeat(16))).toBe(false);
    });

    it("rejects handles with invalid characters", () => {
      expect(isValidTwitterHandle("user-name")).toBe(false);
      expect(isValidTwitterHandle("user.name")).toBe(false);
      expect(isValidTwitterHandle("user name")).toBe(false);
      expect(isValidTwitterHandle("ユーザー")).toBe(false);
    });

    it("rejects empty handles", () => {
      expect(isValidTwitterHandle("")).toBe(false);
      expect(isValidTwitterHandle("@")).toBe(false);
    });

    it("accepts exactly 15 characters", () => {
      expect(isValidTwitterHandle("a".repeat(15))).toBe(true);
      expect(isValidTwitterHandle("@" + "a".repeat(15))).toBe(true);
    });
  });
});
