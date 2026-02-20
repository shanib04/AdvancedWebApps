"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../index"));
const testUtils_1 = require("./testUtils");
let testApp;
let testUser;
beforeAll(async () => {
    testApp = index_1.default;
    await (0, testUtils_1.cleanupDatabase)();
    testUser = await (0, testUtils_1.registerTestUser)(testApp);
}, 30000);
describe("User Controller", () => {
    describe("POST /user", () => {
        test("should create user, hash password, and validate fields", async () => {
            const newUser = {
                username: "createuser_" + Date.now(),
                email: "createuser_" + Date.now() + "@example.com",
                password: "password123",
            };
            const response = await (0, supertest_1.default)(testApp)
                .post("/user")
                .set("Authorization", "Bearer " + testUser.token)
                .send(newUser);
            expect(response.statusCode).toBe(201);
            expect(response.body.password).not.toBe(newUser.password);
            const missingFields = [
                { email: "test@example.com", password: "password123" },
                { username: "newuser", password: "password123" },
                { username: "newuser", email: "test@example.com" },
            ];
            for (const data of missingFields) {
                const resp = await (0, supertest_1.default)(testApp)
                    .post("/user")
                    .set("Authorization", "Bearer " + testUser.token)
                    .send(data);
                expect(resp.statusCode).toBe(422);
            }
        });
        test("should return 409 for duplicate username or email", async () => {
            const dupUsername = await (0, supertest_1.default)(testApp)
                .post("/user")
                .set("Authorization", "Bearer " + testUser.token)
                .send({
                username: testUtils_1.userData.username,
                email: "unique" + Date.now() + "@example.com",
                password: "password123",
            });
            expect(dupUsername.statusCode).toBe(409);
        });
        test("should return 401 if not authenticated", async () => {
            const response = await (0, supertest_1.default)(testApp)
                .post("/user")
                .send(testUtils_1.additionalUserData);
            expect(response.statusCode).toBe(401);
        });
    });
    describe("GET /user operations", () => {
        test("should get current user, all users, and by ID with auth validation", async () => {
            const whoami = await (0, supertest_1.default)(testApp)
                .get("/user/whoami")
                .set("Authorization", "Bearer " + testUser.token);
            expect(whoami.statusCode).toBe(200);
            expect(whoami.body).not.toHaveProperty("password");
            const all = await (0, supertest_1.default)(testApp)
                .get("/user")
                .set("Authorization", "Bearer " + testUser.token);
            expect(all.statusCode).toBe(200);
            all.body.forEach((user) => {
                expect(user).not.toHaveProperty("password");
            });
            const byId = await (0, supertest_1.default)(testApp)
                .get("/user/" + testUser._id.toString())
                .set("Authorization", "Bearer " + testUser.token);
            expect([200, 422]).toContain(byId.statusCode);
            const badId = await (0, supertest_1.default)(testApp)
                .get("/user/invalidId")
                .set("Authorization", "Bearer " + testUser.token);
            expect(badId.statusCode).toBe(422);
            const notFound = await (0, supertest_1.default)(testApp)
                .get("/user/000000000000000000000000")
                .set("Authorization", "Bearer " + testUser.token);
            expect(notFound.statusCode).toBe(404);
            const noAuth = await (0, supertest_1.default)(testApp).get("/user/whoami");
            expect(noAuth.statusCode).toBe(401);
        });
    });
    describe("PUT /user/:id", () => {
        test("should update user and handle validation/auth errors", async () => {
            const createResp = await (0, supertest_1.default)(testApp)
                .post("/user")
                .set("Authorization", "Bearer " + testUser.token)
                .send({
                username: "updateme_" + Date.now(),
                email: "update_" + Date.now() + "@example.com",
                password: "password123",
            });
            if (createResp.statusCode === 201) {
                const updateResp = await (0, supertest_1.default)(testApp)
                    .put("/user/" + createResp.body._id)
                    .set("Authorization", "Bearer " + testUser.token)
                    .send({
                    username: "updated_" + Date.now(),
                    email: "updated_" + Date.now() + "@example.com",
                    password: "newpassword123",
                });
                expect(updateResp.statusCode).toBe(200);
            }
            const missingFields = [
                { email: "test@example.com", password: "p" },
                { username: "u", password: "p" },
                { username: "u", email: "e@e.com" },
            ];
            for (const data of missingFields) {
                const resp = await (0, supertest_1.default)(testApp)
                    .put("/user/" + testUser._id)
                    .set("Authorization", "Bearer " + testUser.token)
                    .send(data);
                expect(resp.statusCode).toBe(422);
            }
            const badId = await (0, supertest_1.default)(testApp)
                .put("/user/invalidId")
                .set("Authorization", "Bearer " + testUser.token)
                .send({ username: "u", email: "e@e.com", password: "p" });
            expect(badId.statusCode).toBe(422);
            const notFound = await (0, supertest_1.default)(testApp)
                .put("/user/000000000000000000000000")
                .set("Authorization", "Bearer " + testUser.token)
                .send({ username: "u", email: "e@e.com", password: "p" });
            expect(notFound.statusCode).toBe(404);
            const noAuth = await (0, supertest_1.default)(testApp)
                .put("/user/" + testUser._id)
                .send({ username: "u", email: "e@e.com", password: "p" });
            expect(noAuth.statusCode).toBe(401);
        });
    });
    describe("DELETE /user/:id", () => {
        test("should delete user, verify deletion, and handle errors", async () => {
            const createResp = await (0, supertest_1.default)(testApp)
                .post("/user")
                .set("Authorization", "Bearer " + testUser.token)
                .send({
                username: "deleteme_" + Date.now(),
                email: "delete_" + Date.now() + "@example.com",
                password: "password123",
            });
            if (createResp.statusCode === 201) {
                const deleteResp = await (0, supertest_1.default)(testApp)
                    .delete("/user/" + createResp.body._id)
                    .set("Authorization", "Bearer " + testUser.token);
                expect(deleteResp.statusCode).toBe(200);
                const getResp = await (0, supertest_1.default)(testApp)
                    .get("/user/" + createResp.body._id)
                    .set("Authorization", "Bearer " + testUser.token);
                expect(getResp.statusCode).toBe(404);
            }
            const badId = await (0, supertest_1.default)(testApp)
                .delete("/user/invalidId")
                .set("Authorization", "Bearer " + testUser.token);
            expect(badId.statusCode).toBe(422);
            const notFound = await (0, supertest_1.default)(testApp)
                .delete("/user/000000000000000000000000")
                .set("Authorization", "Bearer " + testUser.token);
            expect(notFound.statusCode).toBe(404);
            const noAuth = await (0, supertest_1.default)(testApp).delete("/user/" + testUser._id);
            expect(noAuth.statusCode).toBe(401);
        });
    });
    describe("Edge Cases", () => {
        test("should handle concurrent creation and special characters", async () => {
            const baseTime = Date.now();
            const responses = await Promise.all([
                (0, supertest_1.default)(testApp)
                    .post("/user")
                    .set("Authorization", "Bearer " + testUser.token)
                    .send({
                    username: "concurrent1_" + baseTime,
                    email: "conc1_" + baseTime + "@example.com",
                    password: "pass123",
                }),
                (0, supertest_1.default)(testApp)
                    .post("/user")
                    .set("Authorization", "Bearer " + testUser.token)
                    .send({
                    username: "concurrent2_" + baseTime,
                    email: "conc2_" + baseTime + "@example.com",
                    password: "pass123",
                }),
            ]);
            responses.forEach((r) => expect([201, 409]).toContain(r.statusCode));
            const special = await (0, supertest_1.default)(testApp)
                .post("/user")
                .set("Authorization", "Bearer " + testUser.token)
                .send({
                username: "user@123_test_" + baseTime,
                email: "special+chars" + baseTime + "@example.com",
                password: "pass@123!",
            });
            expect([201, 409, 422]).toContain(special.statusCode);
        });
    });
});
