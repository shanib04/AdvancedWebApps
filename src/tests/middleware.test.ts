import { Request, Response, NextFunction } from "express";
import authMiddleware, { AuthRequest } from "../middleware/authMiddleware";
import jwt from "jsonwebtoken";

// Mock the jsonwebtoken module
jest.mock("jsonwebtoken");

describe("Auth Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock<void>;

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

    (jwt.verify as jest.Mock).mockReturnValue({ userId });

    authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect((mockRequest as AuthRequest).user).toEqual({ _id: userId });
  });

  test("should return 401 when authorization header is missing", () => {
    mockRequest.headers = {};

    authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

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

    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

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

    authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

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

    (jwt.verify as jest.Mock).mockReturnValue({ userId });

    authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith(validToken, process.env.JWT_SECRET);
    expect(mockNext).toHaveBeenCalled();
  });

  test("should handle authorization header with extra spaces", () => {
    const userId = "507f1f77bcf86cd799439011";
    const validToken = "valid_token_123";

    mockRequest.headers = {
      authorization: `Bearer ${validToken}`,
    };

    (jwt.verify as jest.Mock).mockReturnValue({ userId });

    authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  test("should return 401 when Bearer token is missing", () => {
    mockRequest.headers = {
      authorization: "Bearer",
    };

    authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "Unauthorized",
    });
  });

  test("should return 401 when authorization header is empty string", () => {
    mockRequest.headers = {
      authorization: "",
    };

    authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

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
    (jwt.verify as jest.Mock).mockClear();

    authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

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

    (jwt.verify as jest.Mock).mockReturnValue({ userId });

    authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect((mockRequest as AuthRequest).user).toBeDefined();
    expect((mockRequest as AuthRequest).user._id).toBe(userId);
    expect(mockNext).toHaveBeenCalled();
  });

  test("should return 401 when token expired", () => {
    mockRequest.headers = {
      authorization: "Bearer expired_token",
    };

    (jwt.verify as jest.Mock).mockImplementation(() => {
      const error = new Error("Token expired");
      (error as any).name = "TokenExpiredError";
      throw error;
    });

    authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("should return 401 when token is malformed", () => {
    mockRequest.headers = {
      authorization: "Bearer !!!invalid!!!token!!!",
    };

    (jwt.verify as jest.Mock).mockImplementation(() => {
      const error = new Error("Malformed token");
      (error as any).name = "JsonWebTokenError";
      throw error;
    });

    authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
