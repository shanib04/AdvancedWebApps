import request from "supertest";
import app from "../index";
import { Express } from "express";
import jwt from "jsonwebtoken";
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
      const unique = Date.now().toString().slice(-6);
      const newUser = {
        username: `cru_${unique}`,
        email: `create_${unique}@example.com`,
        password: "password123",
      };

      const response = await request(testApp)
        .post("/user")
        .set("Authorization", "Bearer " + testUser.accessToken)
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
          .set("Authorization", "Bearer " + testUser.accessToken)
          .send(data);
        expect(resp.statusCode).toBe(422);
      }
    });

    test("should return 409 for duplicate username or email", async () => {
      const dupUsername = await request(testApp)
        .post("/user")
        .set("Authorization", "Bearer " + testUser.accessToken)
        .send({
          username: userData.username,
          email: "unique" + Date.now() + "@example.com",
          password: "password123",
        });
      expect(dupUsername.statusCode).toBe(409);

      const dupEmail = await request(testApp)
        .post("/user")
        .set("Authorization", "Bearer " + testUser.accessToken)
        .send({
          username: "dupemail",
          email: userData.email,
          password: "password123",
        });
      expect(dupEmail.statusCode).toBe(409);
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
        .set("Authorization", "Bearer " + testUser.accessToken);
      expect(whoami.statusCode).toBe(200);
      expect(whoami.body).not.toHaveProperty("password");
      expect(whoami.body).toHaveProperty("postsCount");

      const all = await request(testApp)
        .get("/user")
        .set("Authorization", "Bearer " + testUser.accessToken);
      expect(all.statusCode).toBe(200);
      all.body.forEach((user: any) => {
        expect(user).not.toHaveProperty("password");
      });

      const byId = await request(testApp)
        .get("/user/" + testUser._id.toString())
        .set("Authorization", "Bearer " + testUser.accessToken);
      expect(byId.statusCode).toBe(200);
      expect(byId.body).toHaveProperty("postsCount");

      const badId = await request(testApp)
        .get("/user/invalidId")
        .set("Authorization", "Bearer " + testUser.accessToken);
      expect(badId.statusCode).toBe(422);

      const notFound = await request(testApp)
        .get("/user/000000000000000000000000")
        .set("Authorization", "Bearer " + testUser.accessToken);
      expect(notFound.statusCode).toBe(404);

      const noAuth = await request(testApp).get("/user/whoami");
      expect(noAuth.statusCode).toBe(401);

      const ghostToken = jwt.sign(
        { userId: "507f1f77bcf86cd799439012" },
        process.env.JWT_SECRET as string,
      );
      const ghostWhoAmI = await request(testApp)
        .get("/user/whoami")
        .set("Authorization", "Bearer " + ghostToken);
      expect(ghostWhoAmI.statusCode).toBe(404);
    });
  });

  describe("PATCH /user/:id", () => {
    test("should enforce validation and auth errors", async () => {
      const noFields = await request(testApp)
        .patch("/user/" + testUser._id)
        .set("Authorization", "Bearer " + testUser.accessToken)
        .send({});
      expect(noFields.statusCode).toBe(422);

      const badId = await request(testApp)
        .patch("/user/invalidId")
        .set("Authorization", "Bearer " + testUser.accessToken)
        .send({ username: "u" });
      expect(badId.statusCode).toBe(422);

      const notFound = await request(testApp)
        .patch("/user/000000000000000000000000")
        .set("Authorization", "Bearer " + testUser.accessToken)
        .send({ username: "u" });
      expect(notFound.statusCode).toBe(403);

      const noAuth = await request(testApp)
        .patch("/user/" + testUser._id)
        .send({ username: "u" });
      expect(noAuth.statusCode).toBe(401);
    });

    test("should update own username email and password in one request", async () => {
      const unique = Date.now().toString().slice(-6);
      const response = await request(testApp)
        .patch("/user/" + testUser._id)
        .set("Authorization", "Bearer " + testUser.accessToken)
        .send({
          username: `owner_${unique}`,
          email: `owner_${unique}@example.com`,
          password: "new_owner_password",
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("username", `owner_${unique}`);
      expect(response.body).toHaveProperty(
        "email",
        `owner_${unique}@example.com`,
      );
    });

    test("should update profile metadata and return 404 for missing authenticated user", async () => {
      const updated = await request(testApp)
        .patch("/user/" + testUser._id)
        .set("Authorization", "Bearer " + testUser.accessToken)
        .send({
          displayName: "Test Display",
          bio: "Updated bio",
          photoUrl: "https://example.com/me.png",
        });

      expect(updated.statusCode).toBe(200);
      expect(updated.body).toHaveProperty("displayName", "Test Display");
      expect(updated.body).toHaveProperty("bio", "Updated bio");
      expect(updated.body).toHaveProperty(
        "photoUrl",
        "https://example.com/me.png",
      );

      const ghostId = "507f1f77bcf86cd799439013";
      const ghostToken = jwt.sign(
        { userId: ghostId },
        process.env.JWT_SECRET as string,
      );
      const missingUser = await request(testApp)
        .patch(`/user/${ghostId}`)
        .set("Authorization", "Bearer " + ghostToken)
        .send({ displayName: "Ghost" });
      expect(missingUser.statusCode).toBe(404);
    });
  });

  describe("DELETE /user/:id", () => {
    test("should delete user, verify deletion, and handle errors", async () => {
      const unique = Date.now().toString().slice(-6);
      const createResp = await request(testApp)
        .post("/user")
        .set("Authorization", "Bearer " + testUser.accessToken)
        .send({
          username: `del_${unique}`,
          email: `delete_${unique}@example.com`,
          password: "password123",
        });

      expect(createResp.statusCode).toBe(201);

      const deleteResp = await request(testApp)
        .delete("/user/" + createResp.body._id)
        .set("Authorization", "Bearer " + testUser.accessToken);
      expect(deleteResp.statusCode).toBe(200);

      const getResp = await request(testApp)
        .get("/user/" + createResp.body._id)
        .set("Authorization", "Bearer " + testUser.accessToken);
      expect(getResp.statusCode).toBe(404);

      const badId = await request(testApp)
        .delete("/user/invalidId")
        .set("Authorization", "Bearer " + testUser.accessToken);
      expect(badId.statusCode).toBe(422);

      const notFound = await request(testApp)
        .delete("/user/000000000000000000000000")
        .set("Authorization", "Bearer " + testUser.accessToken);
      expect(notFound.statusCode).toBe(404);

      const noAuth = await request(testApp).delete("/user/" + testUser._id);
      expect(noAuth.statusCode).toBe(401);
    });
  });
});
