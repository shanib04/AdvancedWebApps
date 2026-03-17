import { getErrorMessage } from "../utils/getErrorMessage";
import { validateObjectId } from "../controllers/validateId";

describe("getErrorMessage", () => {
  test("returns the message for Error instances", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  test("returns fallback for non-Error values", () => {
    expect(getErrorMessage("oops")).toBe("Unknown error");
  });
});

describe("validateObjectId", () => {
  test("accepts valid ObjectId values", () => {
    expect(validateObjectId("507f1f77bcf86cd799439011")).toBe(true);
    expect(
      validateObjectId([
        "507f1f77bcf86cd799439011",
        "507f1f77bcf86cd799439012",
      ]),
    ).toBe(true);
  });

  test("rejects invalid ObjectId values", () => {
    expect(validateObjectId("invalid-id")).toBe(false);
    expect(validateObjectId("" as unknown as string)).toBe(false);
    expect(validateObjectId(null as unknown as string)).toBe(false);
    expect(validateObjectId(["507f1f77bcf86cd799439011", "bad-id"])).toBe(
      false,
    );
  });
});
