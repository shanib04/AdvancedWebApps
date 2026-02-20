"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../config/db"));
const mongoose_1 = __importDefault(require("mongoose"));
jest.mock("mongoose");
describe("Database Configuration", () => {
    let originalMongoUri;
    beforeEach(() => {
        originalMongoUri = process.env.MONGO_URI;
        jest.clearAllMocks();
    });
    afterEach(() => {
        process.env.MONGO_URI = originalMongoUri;
    });
    test("should connect to MongoDB successfully", async () => {
        process.env.MONGO_URI = "mongodb://localhost:27017/test";
        mongoose_1.default.connect.mockResolvedValue(undefined);
        const consoleSpy = jest.spyOn(console, "log").mockImplementation();
        await (0, db_1.default)();
        expect(mongoose_1.default.connect).toHaveBeenCalledWith(process.env.MONGO_URI);
        expect(consoleSpy).toHaveBeenCalledWith("MongoDB connected");
        consoleSpy.mockRestore();
    });
    test("should throw error if MONGO_URI is not defined", async () => {
        delete process.env.MONGO_URI;
        await expect((0, db_1.default)()).rejects.toThrow("MONGO_URI is not defined in .env");
        expect(mongoose_1.default.connect).not.toHaveBeenCalled();
    });
    test("should throw error if MONGO_URI is empty string", async () => {
        process.env.MONGO_URI = "";
        await expect((0, db_1.default)()).rejects.toThrow("MONGO_URI is not defined in .env");
        expect(mongoose_1.default.connect).not.toHaveBeenCalled();
    });
    test("should handle connection errors", async () => {
        process.env.MONGO_URI = "mongodb://invalid-connection";
        const connectionError = new Error("Failed to connect to MongoDB");
        mongoose_1.default.connect.mockRejectedValue(connectionError);
        await expect((0, db_1.default)()).rejects.toThrow("Failed to connect to MongoDB");
        expect(mongoose_1.default.connect).toHaveBeenCalledWith(process.env.MONGO_URI);
    });
});
