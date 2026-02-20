"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../index"));
const testUtils_1 = require("./testUtils");
let testApp;
beforeAll(async () => {
    testApp = index_1.default;
    await (0, testUtils_1.cleanupDatabase)();
    await (0, testUtils_1.registerTestUser)(testApp);
}, 30000);
describe("Auth Controller", () => {
    describe("POST /auth/register", () => {
        test("should register and return tokens", async () => {
            const response = await (0, supertest_1.default)(testApp).post("/auth/register").send({
                username: "newregisteruser",
                email: "newregister@example.com",
                password: "password123",
            });
            expect(response.statusCode).toBe(201);
            expect(response.body).toHaveProperty("token");
            expect(response.body).toHaveProperty("refreshToken");
        });
        test("should return 422 if required fields are missing", async () => {
            const response = await (0, supertest_1.default)(testApp)
                .post("/auth/register")
                .send({ username: "testuser" });
            expect(response.statusCode).toBe(422);
            expect(response.body).toHaveProperty("error");
        });
        test("should return 409 for duplicate username or email", async () => {
            const dupUsername = await (0, supertest_1.default)(testApp).post("/auth/register").send({
                username: testUtils_1.userData.username,
                email: "unique1@example.com",
                password: "password123",
            });
            expect(dupUsername.statusCode).toBe(409);
            const dupEmail = await (0, supertest_1.default)(testApp).post("/auth/register").send({
                username: "uniqueuser",
                email: testUtils_1.userData.email,
                password: "password123",
            });
            expect(dupEmail.statusCode).toBe(409);
        });
        test("should handle special characters in username and email", async () => {
            const response = await (0, supertest_1.default)(testApp).post("/auth/register").send({
                username: "user@123_test",
                email: "special+chars@example.com",
                password: "pass@123!",
            });
            expect(response.statusCode).toBe(201);
        });
    });
    describe("POST /auth/login", () => {
        test("should login and return tokens", async () => {
            const response = await (0, supertest_1.default)(testApp)
                .post("/auth/login")
                .send({ username: testUtils_1.userData.username, password: testUtils_1.userData.password });
            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty("token");
            expect(response.body).toHaveProperty("refreshToken");
        });
        test("should return 422 if required fields are missing", async () => {
            const response = await (0, supertest_1.default)(testApp)
                .post("/auth/login")
                .send({ password: "testuser" });
            expect(response.statusCode).toBe(422);
            expect(response.body).toHaveProperty("error");
        });
        test("should return 401 for invalid credentials", async () => {
            const invalidCreds = [
                { username: "nonexistent", password: "password123" },
                { username: testUtils_1.userData.username, password: "wrongpassword" },
            ];
            for (const creds of invalidCreds) {
                const response = await (0, supertest_1.default)(testApp).post("/auth/login").send(creds);
                expect(response.statusCode).toBe(401);
                expect(response.body.error).toContain("Invalid");
            }
        });
    });
    describe("POST /auth/refresh", () => {
        test("should return new tokens with valid refresh token", async () => {
            const loginResponse = await (0, supertest_1.default)(testApp)
                .post("/auth/login")
                .send({ username: testUtils_1.userData.username, password: testUtils_1.userData.password });
            const response = await (0, supertest_1.default)(testApp)
                .post("/auth/refresh")
                .send({ refreshToken: loginResponse.body.refreshToken });
            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty("token");
            expect(response.body).toHaveProperty("refreshToken");
        });
        test("should return 401 for invalid or expired tokens", async () => {
            const invalid = await (0, supertest_1.default)(testApp)
                .post("/auth/refresh")
                .send({ refreshToken: "invalid-token" });
            expect(invalid.statusCode).toBe(401);
            const expired = await (0, supertest_1.default)(testApp).post("/auth/refresh").send({
                refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjB9.invalid",
            });
            expect(expired.statusCode).toBe(401);
        });
    });
    describe("POST /auth/logout", () => {
        test("should logout successfully and handle errors", async () => {
            const loginResponse = await (0, supertest_1.default)(testApp)
                .post("/auth/login")
                .send({ username: testUtils_1.userData.username, password: testUtils_1.userData.password });
            const response = await (0, supertest_1.default)(testApp)
                .post("/auth/logout")
                .send({ refreshToken: loginResponse.body.refreshToken });
            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty("message");
            const missingToken = await (0, supertest_1.default)(testApp).post("/auth/logout").send({});
            expect(missingToken.statusCode).toBe(422);
            const invalidToken = await (0, supertest_1.default)(testApp)
                .post("/auth/logout")
                .send({ refreshToken: "invalid-token" });
            expect(invalidToken.statusCode).toBe(401);
        });
    });
});
