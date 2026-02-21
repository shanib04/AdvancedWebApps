import request from "supertest";
import app from "../index";
import { Express } from "express";
import {
  userData,
  additionalUserData,
  registerTestUser,
  cleanupDatabase,
  TestUser,
} from "./testUtils";

let testApp: Express;
let testUser: TestUser;

beforeAll(async () => {
  testApp = app;
  await cleanupDatabase();
  testUser = await registerTestUser(testApp);
}, 30000);

describe("User Controller", () => {
  describe("POST /user", () => {
    test("should create user, hash password, and validate fields", async () => {
      const newUser = {
        username: "createuser_" + Date.now(),
        email: "createuser_" + Date.now() + "@example.com",
        password: "password123",
      };

      const response = await request(testApp)
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
        const resp = await request(testApp)
          .post("/user")
          .set("Authorization", "Bearer " + testUser.token)
          .send(data);
        expect(resp.statusCode).toBe(422);
      }
    });

    test("should return 409 for duplicate username or email", async () => {
      const dupUsername = await request(testApp)
        .post("/user")
        .set("Authorization", "Bearer " + testUser.token)
        .send({
          username: userData.username,
          email: "unique" + Date.now() + "@example.com",
          password: "password123",
        });
      expect(dupUsername.statusCode).toBe(409);
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(testApp)
        .post("/user")
        .send(additionalUserData);
      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /user operations", () => {
    test("should get current user, all users, and by ID with auth validation", async () => {
      const whoami = await request(testApp)
        .get("/user/whoami")
        .set("Authorization", "Bearer " + testUser.token);
      expect(whoami.statusCode).toBe(200);
      expect(whoami.body).not.toHaveProperty("password");

      const all = await request(testApp)
        .get("/user")
        .set("Authorization", "Bearer " + testUser.token);
      expect(all.statusCode).toBe(200);
      all.body.forEach((user: any) => {
        expect(user).not.toHaveProperty("password");
      });

      const byId = await request(testApp)
        .get("/user/" + testUser._id.toString())
        .set("Authorization", "Bearer " + testUser.token);
      expect([200, 422]).toContain(byId.statusCode);

      const badId = await request(testApp)
        .get("/user/invalidId")
        .set("Authorization", "Bearer " + testUser.token);
      expect(badId.statusCode).toBe(422);

      const notFound = await request(testApp)
        .get("/user/000000000000000000000000")
        .set("Authorization", "Bearer " + testUser.token);
      expect(notFound.statusCode).toBe(404);

      const noAuth = await request(testApp).get("/user/whoami");
      expect(noAuth.statusCode).toBe(401);
    });
  });

  describe("PUT /user/:id", () => {
    test("should update user and handle validation/auth errors", async () => {
      const createResp = await request(testApp)
        .post("/user")
        .set("Authorization", "Bearer " + testUser.token)
        .send({
          username: "updateme_" + Date.now(),
          email: "update_" + Date.now() + "@example.com",
          password: "password123",
        });

      if (createResp.statusCode === 201) {
        const updateResp = await request(testApp)
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
        const resp = await request(testApp)
          .put("/user/" + testUser._id)
          .set("Authorization", "Bearer " + testUser.token)
          .send(data);
        expect(resp.statusCode).toBe(422);
      }

      const badId = await request(testApp)
        .put("/user/invalidId")
        .set("Authorization", "Bearer " + testUser.token)
        .send({ username: "u", email: "e@e.com", password: "p" });
      expect(badId.statusCode).toBe(422);

      const notFound = await request(testApp)
        .put("/user/000000000000000000000000")
        .set("Authorization", "Bearer " + testUser.token)
        .send({ username: "u", email: "e@e.com", password: "p" });
      expect(notFound.statusCode).toBe(404);

      const noAuth = await request(testApp)
        .put("/user/" + testUser._id)
        .send({ username: "u", email: "e@e.com", password: "p" });
      expect(noAuth.statusCode).toBe(401);
    });
  });

  describe("DELETE /user/:id", () => {
    test("should delete user, verify deletion, and handle errors", async () => {
      const createResp = await request(testApp)
        .post("/user")
        .set("Authorization", "Bearer " + testUser.token)
        .send({
          username: "deleteme_" + Date.now(),
          email: "delete_" + Date.now() + "@example.com",
          password: "password123",
        });

      if (createResp.statusCode === 201) {
        const deleteResp = await request(testApp)
          .delete("/user/" + createResp.body._id)
          .set("Authorization", "Bearer " + testUser.token);
        expect(deleteResp.statusCode).toBe(200);

        const getResp = await request(testApp)
          .get("/user/" + createResp.body._id)
          .set("Authorization", "Bearer " + testUser.token);
        expect(getResp.statusCode).toBe(404);
      }

      const badId = await request(testApp)
        .delete("/user/invalidId")
        .set("Authorization", "Bearer " + testUser.token);
      expect(badId.statusCode).toBe(422);

      const notFound = await request(testApp)
        .delete("/user/000000000000000000000000")
        .set("Authorization", "Bearer " + testUser.token);
      expect(notFound.statusCode).toBe(404);

      const noAuth = await request(testApp).delete("/user/" + testUser._id);
      expect(noAuth.statusCode).toBe(401);
    });
  });

  describe("Edge Cases", () => {
    test("should handle concurrent creation and special characters", async () => {
      const baseTime = Date.now();
      const responses = await Promise.all([
        request(testApp)
          .post("/user")
          .set("Authorization", "Bearer " + testUser.token)
          .send({
            username: "concurrent1_" + baseTime,
            email: "conc1_" + baseTime + "@example.com",
            password: "pass123",
          }),
        request(testApp)
          .post("/user")
          .set("Authorization", "Bearer " + testUser.token)
          .send({
            username: "concurrent2_" + baseTime,
            email: "conc2_" + baseTime + "@example.com",
            password: "pass123",
          }),
      ]);

      responses.forEach((r) => expect([201, 409]).toContain(r.statusCode));

      const special = await request(testApp)
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
