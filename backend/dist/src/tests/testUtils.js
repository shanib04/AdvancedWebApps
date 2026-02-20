"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupDatabase = exports.registerTestUser = exports.additionalUserData = exports.userData = void 0;
const supertest_1 = __importDefault(require("supertest"));
const userModel_1 = __importDefault(require("../models/userModel"));
exports.userData = {
    username: "testuser",
    email: "test@example.com",
    password: "password123",
};
exports.additionalUserData = {
    username: "otheruser123",
    email: "other123@example.com",
    password: "password456",
};
const registerTestUser = async (app) => {
    const response = await (0, supertest_1.default)(app).post("/auth/register").send(exports.userData);
    if (response.statusCode !== 201) {
        throw new Error(`Failed to register test user: ${response.body.error}`);
    }
    return {
        _id: response.body._id || "testUserId",
        username: exports.userData.username,
        email: exports.userData.email,
        token: response.body.token,
        refreshToken: response.body.refreshToken,
    };
};
exports.registerTestUser = registerTestUser;
const cleanupDatabase = async () => {
    await userModel_1.default.deleteMany({});
};
exports.cleanupDatabase = cleanupDatabase;
