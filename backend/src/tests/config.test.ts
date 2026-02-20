import connectDB from "../config/db";
import mongoose from "mongoose";

jest.mock("mongoose");

describe("Database Configuration", () => {
  let originalMongoUri: string | undefined;

  beforeEach(() => {
    originalMongoUri = process.env.MONGO_URI;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.MONGO_URI = originalMongoUri;
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

  test("should throw error if MONGO_URI is not defined", async () => {
    delete process.env.MONGO_URI;

    await expect(connectDB()).rejects.toThrow(
      "MONGO_URI is not defined in .env"
    );
    expect(mongoose.connect).not.toHaveBeenCalled();
  });

  test("should throw error if MONGO_URI is empty string", async () => {
    process.env.MONGO_URI = "";

    await expect(connectDB()).rejects.toThrow(
      "MONGO_URI is not defined in .env"
    );
    expect(mongoose.connect).not.toHaveBeenCalled();
  });

  test("should handle connection errors", async () => {
    process.env.MONGO_URI = "mongodb://invalid-connection";
    const connectionError = new Error("Failed to connect to MongoDB");
    (mongoose.connect as jest.Mock).mockRejectedValue(connectionError);

    await expect(connectDB()).rejects.toThrow("Failed to connect to MongoDB");
    expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGO_URI);
  });
});
