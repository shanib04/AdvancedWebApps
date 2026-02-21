import { validateObjectId } from "../controllers/validateId";

describe("validateObjectId", () => {
  test("should return true for valid single ObjectId", () => {
    const validId = "507f1f77bcf86cd799439011";
    expect(validateObjectId(validId)).toBe(true);
  });

  test("should return false for invalid single ObjectId", () => {
    expect(validateObjectId("invalidid")).toBe(false);
    expect(validateObjectId("")).toBe(false);
    expect(validateObjectId(null)).toBe(false);
  });

  test("should return true for valid array of ObjectIds", () => {
    const validIds = ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"];
    expect(validateObjectId(validIds)).toBe(true);
  });

  test("should return false for array with invalid ObjectId", () => {
    const mixedIds = ["507f1f77bcf86cd799439011", "invalidid"];
    expect(validateObjectId(mixedIds)).toBe(false);
  });

  test("should return false for empty array", () => {
    expect(validateObjectId([])).toBe(true);
  });
});
