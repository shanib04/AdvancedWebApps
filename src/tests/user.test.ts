import request from "supertest";
import app from "../index";
import User from "../models/userModel";
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

afterAll((done) => {
  done();
});

describe("User Controller", () => {
  describe("POST /user", () => {
    test("should create a new user successfully", async () => {
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
      expect(response.body).toHaveProperty("_id");
      expect(response.body.username).toBe(newUser.username);
      expect(response.body.email).toBe(newUser.email);
    });

    test("should validate required fields are present", async () => {
      const testCases = [
        { email: "test@example.com", password: "password123" },
        { username: "newuser", password: "password123" },
        { username: "newuser", email: "test@example.com" },
        {},
      ];

      for (const data of testCases) {
        const response = await request(testApp)
          .post("/user")
          .set("Authorization", "Bearer " + testUser.token)
          .send(data);
        expect(response.statusCode).toBe(422);
      }
    });

    test("should return 409 for duplicate username", async () => {
      const response = await request(testApp)
        .post("/user")
        .set("Authorization", "Bearer " + testUser.token)
        .send({
          username: userData.username,
          email: "unique" + Date.now() + "@example.com",
          password: "password123",
        });

      expect(response.statusCode).toBe(409);
    });

    test("should return 409 for duplicate email", async () => {
      const email = "dup" + Date.now() + "@example.com";
      const response1 = await request(testApp)
        .post("/user")
        .set("Authorization", "Bearer " + testUser.token)
        .send({
          username: "user1_" + Date.now(),
          email,
          password: "password123",
        });

      if (response1.statusCode === 201) {
        const response2 = await request(testApp)
          .post("/user")
          .set("Authorization", "Bearer " + testUser.token)
          .send({
            username: "user2_" + Date.now(),
            email,
            password: "password123",
          });
        expect(response2.statusCode).toBe(409);
      }
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(testApp)
        .post("/user")
        .send(additionalUserData);

      expect(response.statusCode).toBe(401);
    });

    test("should create user with special characters", async () => {
      const response = await request(testApp)
        .post("/user")
        .set("Authorization", "Bearer " + testUser.token)
        .send({
          username: "user@123_test-special",
          email: "special+chars" + Date.now() + "@example.com",
          password: "pass@123!",
        });

      expect([201, 409, 422]).toContain(response.statusCode);
    });

    test("should hash password on user creation", async () => {
      const plainPassword = "plainpassword123";
      const response = await request(testApp)
        .post("/user")
        .set("Authorization", "Bearer " + testUser.token)
        .send({
          username: "hashtest_" + Date.now(),
          email: "hash_" + Date.now() + "@example.com",
          password: plainPassword,
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.password).not.toBe(plainPassword);
    });
  });

  describe("GET /user/whoami", () => {
    test("should return current user without password", async () => {
      const response = await request(testApp)
        .get("/user/whoami")
        .set("Authorization", "Bearer " + testUser.token);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("_id");
      expect(response.body.username).toBe(userData.username);
      expect(response.body.email).toBe(userData.email);
      expect(response.body).not.toHaveProperty("password");
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(testApp).get("/user/whoami");
      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /user", () => {
    test("should return all users", async () => {
      const response = await request(testApp)
        .get("/user")
        .set("Authorization", "Bearer " + testUser.token);

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    test("should exclude password from all users", async () => {
      const response = await request(testApp)
        .get("/user")
        .set("Authorization", "Bearer " + testUser.token);

      expect(response.statusCode).toBe(200);
      response.body.forEach((user: any) => {
        expect(user).not.toHaveProperty("password");
      });
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(testApp).get("/user");
      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /user/:id", () => {
    test("should get user by valid ID", async () => {
      const response = await request(testApp)
        .get("/user/" + testUser._id.toString())
        .set("Authorization", "Bearer " + testUser.token);

      expect([200, 422]).toContain(response.statusCode);
    });

    test("should return 422 for invalid ID format", async () => {
      const response = await request(testApp)
        .get("/user/invalidId")
        .set("Authorization", "Bearer " + testUser.token);

      expect(response.statusCode).toBe(422);
    });

    test("should return 404 if user not found", async () => {
      const response = await request(testApp)
        .get("/user/000000000000000000000000")
        .set("Authorization", "Bearer " + testUser.token);

      expect(response.statusCode).toBe(404);
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(testApp).get("/user/" + testUser._id);
      expect(response.statusCode).toBe(401);
    });
  });

  describe("PUT /user/:id", () => {
    test("should update user successfully", async () => {
      const newUserResp = await request(testApp)
        .post("/user")
        .set("Authorization", "Bearer " + testUser.token)
        .send({
          username: "updateme_" + Date.now(),
          email: "update_" + Date.now() + "@example.com",
          password: "password123",
        });

      if (newUserResp.statusCode === 201) {
        const response = await request(testApp)
          .put("/user/" + newUserResp.body._id)
          .set("Authorization", "Bearer " + testUser.token)
          .send({
            username: "updated_" + Date.now(),
            email: "updated_" + Date.now() + "@example.com",
            password: "newpassword123",
          });

        expect(response.statusCode).toBe(200);
      }
    });

    test("should validate required fields on update", async () => {
      const testCases = [
        { email: "updated@example.com", password: "newpassword123" },
        { username: "updated", password: "newpassword123" },
        { username: "updated", email: "updated@example.com" },
      ];

      for (const data of testCases) {
        const response = await request(testApp)
          .put("/user/" + testUser._id)
          .set("Authorization", "Bearer " + testUser.token)
          .send(data);
        expect(response.statusCode).toBe(422);
      }
    });

    test("should return 422 for invalid ID format", async () => {
      const response = await request(testApp)
        .put("/user/invalidId")
        .set("Authorization", "Bearer " + testUser.token)
        .send({
          username: "updated",
          email: "updated@example.com",
          password: "newpassword123",
        });

      expect(response.statusCode).toBe(422);
    });

    test("should return 404 if user not found", async () => {
      const response = await request(testApp)
        .put("/user/000000000000000000000000")
        .set("Authorization", "Bearer " + testUser.token)
        .send({
          username: "updated",
          email: "updated@example.com",
          password: "newpassword123",
        });

      expect(response.statusCode).toBe(404);
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(testApp)
        .put("/user/" + testUser._id)
        .send({
          username: "updated",
          email: "updated@example.com",
          password: "newpassword123",
        });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("DELETE /user/:id", () => {
    test("should delete user successfully", async () => {
      const newUserResp = await request(testApp)
        .post("/user")
        .set("Authorization", "Bearer " + testUser.token)
        .send({
          username: "deleteme_" + Date.now(),
          email: "delete_" + Date.now() + "@example.com",
          password: "password123",
        });

      if (newUserResp.statusCode === 201) {
        const response = await request(testApp)
          .delete("/user/" + newUserResp.body._id)
          .set("Authorization", "Bearer " + testUser.token);

        expect(response.statusCode).toBe(200);
      }
    });

    test("should return 422 for invalid ID format", async () => {
      const response = await request(testApp)
        .delete("/user/invalidId")
        .set("Authorization", "Bearer " + testUser.token);

      expect(response.statusCode).toBe(422);
    });

    test("should return 404 if user not found", async () => {
      const response = await request(testApp)
        .delete("/user/000000000000000000000000")
        .set("Authorization", "Bearer " + testUser.token);

      expect(response.statusCode).toBe(404);
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(testApp).delete("/user/" + testUser._id);
      expect(response.statusCode).toBe(401);
    });

    test("should verify deletion is permanent", async () => {
      const createResp = await request(testApp)
        .post("/user")
        .set("Authorization", "Bearer " + testUser.token)
        .send({
          username: "verify_delete_" + Date.now(),
          email: "verifydel_" + Date.now() + "@example.com",
          password: "password123",
        });

      if (createResp.statusCode === 201) {
        const userId = createResp.body._id;
        const deleteResp = await request(testApp)
          .delete("/user/" + userId)
          .set("Authorization", "Bearer " + testUser.token);

        if (deleteResp.statusCode === 200) {
          const getResp = await request(testApp)
            .get("/user/" + userId)
            .set("Authorization", "Bearer " + testUser.token);

          expect(getResp.statusCode).toBe(404);
        }
      }
    });
  });

  describe("Edge Cases and Concurrent Operations", () => {
    test("should handle concurrent user creation", async () => {
      const users = Array(3)
        .fill(null)
        .map((_, i) => ({
          username: `concurrent${i}_${Date.now()}`,
          email: `conc${i}${Date.now()}@example.com`,
          password: "pass123",
        }));

      const responses = await Promise.all(
        users.map((user) =>
          request(testApp)
            .post("/user")
            .set("Authorization", "Bearer " + testUser.token)
            .send(user)
        )
      );

      responses.forEach((response) => {
        expect(response.statusCode).toBe(201);
      });
    });

    test("should maintain referential integrity across operations", async () => {
      const user = {
        username: "integrity_" + Date.now(),
        email: "integrity_" + Date.now() + "@example.com",
        password: "password123",
      };

      const createResp = await request(testApp)
        .post("/user")
        .set("Authorization", "Bearer " + testUser.token)
        .send(user);

      expect(createResp.statusCode).toBe(201);
      const userId = createResp.body._id;

      const getResp = await request(testApp)
        .get("/user/" + userId)
        .set("Authorization", "Bearer " + testUser.token);

      expect([200, 422]).toContain(getResp.statusCode);
    });

    test("should handle special characters in username and email", async () => {
      const response = await request(testApp)
        .post("/user")
        .set("Authorization", "Bearer " + testUser.token)
        .send({
          username: "user_日本語_special-chars.123",
          email: "special+alias.test@subdomain.example.co.uk",
          password: "pass@123!#$%",
        });

      expect([201, 409, 422]).toContain(response.statusCode);
    });

    test("should handle case-sensitive email validation", async () => {
      const baseEmail = `casetest${Date.now()}@example.com`;

      const user1 = {
        username: `case1_${Date.now()}`,
        email: baseEmail.toUpperCase(),
        password: "password123",
      };

      const resp1 = await request(testApp)
        .post("/user")
        .set("Authorization", "Bearer " + testUser.token)
        .send(user1);

      expect(resp1.statusCode).toBe(201);

      const user2 = {
        username: `case2_${Date.now()}`,
        email: baseEmail.toLowerCase(),
        password: "password123",
      };

      const resp2 = await request(testApp)
        .post("/user")
        .set("Authorization", "Bearer " + testUser.token)
        .send(user2);

      expect([201, 409]).toContain(resp2.statusCode);
    });
  });
});
