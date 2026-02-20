"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validateId_1 = require("../controllers/validateId");
describe("validateObjectId", () => {
    test("should return true for valid single ObjectId", () => {
        const validId = "507f1f77bcf86cd799439011";
        expect((0, validateId_1.validateObjectId)(validId)).toBe(true);
    });
    test("should return false for invalid single ObjectId", () => {
        expect((0, validateId_1.validateObjectId)("invalidid")).toBe(false);
        expect((0, validateId_1.validateObjectId)("")).toBe(false);
        expect((0, validateId_1.validateObjectId)(null)).toBe(false);
    });
    test("should return true for valid array of ObjectIds", () => {
        const validIds = ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"];
        expect((0, validateId_1.validateObjectId)(validIds)).toBe(true);
    });
    test("should return false for array with invalid ObjectId", () => {
        const mixedIds = ["507f1f77bcf86cd799439011", "invalidid"];
        expect((0, validateId_1.validateObjectId)(mixedIds)).toBe(false);
    });
    test("should return false for empty array", () => {
        expect((0, validateId_1.validateObjectId)([])).toBe(true);
    });
});
