import connectDB from "../config/db";
import mongoose from "mongoose";

jest.mock("mongoose");

describe("Database Configuration", () => {
  let originalMongoUri: string | undefined;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    originalMongoUri = process.env.MONGO_URI;
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, "exit").mockImplementation(((
      code?: number,
    ) => {
      throw new Error(`process.exit:${code}`);
    }) as never);
  });

  afterEach(() => {
    process.env.MONGO_URI = originalMongoUri;
    exitSpy.mockRestore();
  });

  test("should connect to MongoDB successfully", async () => {
    process.env.MONGO_URI = "mongodb://localhost:27017/test";
    (mongoose.connect as jest.Mock).mockResolvedValue(undefined);

    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGO_URI);
    expect(consoleSpy).toHaveBeenCalledWith("MongoDB connected");

    consoleSpy.mockRestore();
  });

  test("should exit process if MONGO_URI is not defined", async () => {
    delete process.env.MONGO_URI;

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    await expect(connectDB()).rejects.toThrow("process.exit:1");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "MONGO_URI is not defined in .env",
    );
    expect(mongoose.connect).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  test("should handle connection errors", async () => {
    process.env.MONGO_URI = "mongodb://invalid-connection";
    const connectionError = new Error("Failed to connect to MongoDB");
    (mongoose.connect as jest.Mock).mockRejectedValue(connectionError);

    await expect(connectDB()).rejects.toThrow("Failed to connect to MongoDB");
    expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGO_URI);
  });
});
