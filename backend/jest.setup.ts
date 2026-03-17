import dotenv from "dotenv";

// Silence console output during tests for cleaner output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

dotenv.config();

if (process.env.MONGO_TEST_URI) {
  process.env.MONGO_URI = process.env.MONGO_TEST_URI;
}

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "3600";
process.env.JWT_REFRESH_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || "86400";
