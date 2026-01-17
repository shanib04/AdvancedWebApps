import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Set test environment variables
process.env.MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/advancedwebapps-test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "3600";
process.env.JWT_REFRESH_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || "86400";

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
