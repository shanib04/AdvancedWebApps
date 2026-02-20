"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Mock the jsonwebtoken module
jest.mock("jsonwebtoken");
describe("Auth Middleware", () => {
    let mockRequest;
    let mockResponse;
    let mockNext;
    beforeEach(() => {
        mockRequest = {
            headers: {},
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
    });
    test("should call next() when authorization header is present and valid", () => {
        const userId = "507f1f77bcf86cd799439011";
        const validToken = "valid_token_123";
        mockRequest.headers = {
            authorization: `Bearer ${validToken}`,
        };
        jsonwebtoken_1.default.verify.mockReturnValue({ userId });
        (0, authMiddleware_1.default)(mockRequest, mockResponse, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockRequest.user).toEqual({ _id: userId });
    });
    test("should return 401 when authorization header is missing", () => {
        mockRequest.headers = {};
        (0, authMiddleware_1.default)(mockRequest, mockResponse, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Unauthorized",
        });
        expect(mockNext).not.toHaveBeenCalled();
    });
    test("should return 401 when token is invalid", () => {
        mockRequest.headers = {
            authorization: "Bearer invalid_token",
        };
        jsonwebtoken_1.default.verify.mockImplementation(() => {
            throw new Error("Invalid token");
        });
        (0, authMiddleware_1.default)(mockRequest, mockResponse, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Unauthorized",
        });
        expect(mockNext).not.toHaveBeenCalled();
    });
    test("should return 401 when authorization header format is invalid", () => {
        mockRequest.headers = {
            authorization: "InvalidFormat token",
        };
        (0, authMiddleware_1.default)(mockRequest, mockResponse, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Unauthorized",
        });
        expect(mockNext).not.toHaveBeenCalled();
    });
    test("should extract Bearer token correctly", () => {
        const userId = "507f1f77bcf86cd799439011";
        const validToken = "valid_token_with_special_chars_!@#$";
        mockRequest.headers = {
            authorization: `Bearer ${validToken}`,
        };
        jsonwebtoken_1.default.verify.mockReturnValue({ userId });
        (0, authMiddleware_1.default)(mockRequest, mockResponse, mockNext);
        expect(jsonwebtoken_1.default.verify).toHaveBeenCalledWith(validToken, process.env.JWT_SECRET);
        expect(mockNext).toHaveBeenCalled();
    });
    test("should handle authorization header with extra spaces", () => {
        const userId = "507f1f77bcf86cd799439011";
        const validToken = "valid_token_123";
        mockRequest.headers = {
            authorization: `Bearer ${validToken}`,
        };
        jsonwebtoken_1.default.verify.mockReturnValue({ userId });
        (0, authMiddleware_1.default)(mockRequest, mockResponse, mockNext);
        expect(mockNext).toHaveBeenCalled();
    });
    test("should return 401 when Bearer token is missing", () => {
        mockRequest.headers = {
            authorization: "Bearer",
        };
        (0, authMiddleware_1.default)(mockRequest, mockResponse, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Unauthorized",
        });
    });
    test("should return 401 when authorization header is empty string", () => {
        mockRequest.headers = {
            authorization: "",
        };
        (0, authMiddleware_1.default)(mockRequest, mockResponse, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Unauthorized",
        });
    });
    test("should return 500 when JWT_SECRET is not configured", () => {
        const originalSecret = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET;
        mockRequest.headers = {
            authorization: "Bearer valid_token",
        };
        // Don't mock jwt.verify - we want the real error
        jsonwebtoken_1.default.verify.mockClear();
        (0, authMiddleware_1.default)(mockRequest, mockResponse, mockNext);
        // Should check for JWT_SECRET and return 500
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "JWT_SECRET is not configured",
        });
        // Restore
        process.env.JWT_SECRET = originalSecret;
    });
    test("should set user on request object with correct format", () => {
        const userId = "507f1f77bcf86cd799439011";
        const validToken = "valid_token";
        mockRequest.headers = {
            authorization: `Bearer ${validToken}`,
        };
        jsonwebtoken_1.default.verify.mockReturnValue({ userId });
        (0, authMiddleware_1.default)(mockRequest, mockResponse, mockNext);
        expect(mockRequest.user).toBeDefined();
        expect(mockRequest.user._id).toBe(userId);
        expect(mockNext).toHaveBeenCalled();
    });
    test("should return 401 when token expired", () => {
        mockRequest.headers = {
            authorization: "Bearer expired_token",
        };
        jsonwebtoken_1.default.verify.mockImplementation(() => {
            const error = new Error("Token expired");
            error.name = "TokenExpiredError";
            throw error;
        });
        (0, authMiddleware_1.default)(mockRequest, mockResponse, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
    });
    test("should return 401 when token is malformed", () => {
        mockRequest.headers = {
            authorization: "Bearer !!!invalid!!!token!!!",
        };
        jsonwebtoken_1.default.verify.mockImplementation(() => {
            const error = new Error("Malformed token");
            error.name = "JsonWebTokenError";
            throw error;
        });
        (0, authMiddleware_1.default)(mockRequest, mockResponse, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
    });
});
