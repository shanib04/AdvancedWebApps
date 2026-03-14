import request from "supertest";
import app from "../index";
import { Express } from "express";
import { OAuth2Client } from "google-auth-library";
import User from "../models/userModel";
import { userData, registerTestUser, cleanupDatabase } from "./testUtils";

let testApp: Express;

beforeAll(async () => {
  testApp = app;
  await cleanupDatabase();
  await registerTestUser(testApp);
}, 30000);

describe("Auth Controller", () => {
  describe("POST /auth/register", () => {
    test("should register and return tokens", async () => {
      const response = await request(testApp).post("/auth/register").send({
        username: "newregisteruser",
        email: "newregister@example.com",
        password: "password123",
      });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty(
        "displayName",
        "newregisteruser",
      );
    });

    test("should return 422 if required fields are missing", async () => {
      const response = await request(testApp)
        .post("/auth/register")
        .send({ username: "testuser" });

      expect(response.statusCode).toBe(422);
      expect(response.body).toHaveProperty("error");
    });

    test("should return 409 for duplicate username or email", async () => {
      const dupUsername = await request(testApp).post("/auth/register").send({
        username: userData.username,
        email: "unique1@example.com",
        password: "password123",
      });
      expect(dupUsername.statusCode).toBe(409);

      const dupEmail = await request(testApp).post("/auth/register").send({
        username: "uniqueuser",
        email: userData.email,
        password: "password123",
      });
      expect(dupEmail.statusCode).toBe(409);
    });

    test("should support custom displayName and relative photoUrl", async () => {
      const response = await request(testApp).post("/auth/register").send({
        username: "regphoto",
        email: "regphoto@example.com",
        password: "password123",
        displayName: "Reg Photo",
        photoUrl: "/custom-avatar.png",
      });

      expect(response.statusCode).toBe(201);
      expect(response.body.user).toHaveProperty("displayName", "Reg Photo");
      expect(response.body.user.photoUrl).toContain("/custom-avatar.png");
    });

    test("should preserve plain photoUrl values that do not start with a slash", async () => {
      const response = await request(testApp).post("/auth/register").send({
        username: "regplainphoto",
        email: "regplainphoto@example.com",
        password: "password123",
        photoUrl: "avatars/plain.png",
      });

      expect(response.statusCode).toBe(201);
      expect(response.body.user).toHaveProperty(
        "photoUrl",
        "avatars/plain.png",
      );
    });
  });

  describe("POST /auth/login", () => {
    test("should login and return tokens", async () => {
      const response = await request(testApp)
        .post("/auth/login")
        .send({ identifier: userData.username, password: userData.password });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body).toHaveProperty("user");
    });

    test("should login successfully with email", async () => {
      const response = await request(testApp)
        .post("/auth/login")
        .send({ email: userData.email, password: userData.password });

      expect(response.statusCode).toBe(200);
      expect(response.body.user).toHaveProperty("email", userData.email);
    });

    test("should return 422 if required fields are missing", async () => {
      const response = await request(testApp)
        .post("/auth/login")
        .send({ password: "testuser" });

      expect(response.statusCode).toBe(422);
      expect(response.body).toHaveProperty("error");
    });

    test("should distinguish user-not-found from wrong-password", async () => {
      const notFound = await request(testApp).post("/auth/login").send({
        identifier: "nonexistent",
        password: "password123",
      });
      expect(notFound.statusCode).toBe(404);
      expect(notFound.body.error).toContain("not found");

      const wrongPassword = await request(testApp).post("/auth/login").send({
        email: userData.email,
        password: "wrongpassword",
      });
      expect(wrongPassword.statusCode).toBe(401);
      expect(wrongPassword.body.error).toContain("Incorrect");
    });
  });

  describe("POST /auth/refresh", () => {
    test("should return new tokens with valid refresh token", async () => {
      const loginResponse = await request(testApp)
        .post("/auth/login")
        .send({ identifier: userData.username, password: userData.password });

      const response = await request(testApp)
        .post("/auth/refresh")
        .send({ refreshToken: loginResponse.body.refreshToken });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
    });

    test("should return 401 for invalid or expired tokens", async () => {
      const invalid = await request(testApp)
        .post("/auth/refresh")
        .send({ refreshToken: "invalid-token" });
      expect(invalid.statusCode).toBe(401);

      const expired = await request(testApp).post("/auth/refresh").send({
        refreshToken:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjB9.invalid",
      });
      expect(expired.statusCode).toBe(401);
    });

    test("should handle missing secret and refresh tokens no longer stored", async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const missingSecret = await request(testApp)
        .post("/auth/refresh")
        .send({ refreshToken: "whatever" });
      expect(missingSecret.statusCode).toBe(500);

      process.env.JWT_SECRET = originalSecret;

      const loginResponse = await request(testApp)
        .post("/auth/login")
        .send({ identifier: userData.username, password: userData.password });

      await User.updateOne(
        { email: userData.email },
        { $set: { refreshToken: [] } },
      );

      const removedToken = await request(testApp)
        .post("/auth/refresh")
        .send({ refreshToken: loginResponse.body.refreshToken });
      expect(removedToken.statusCode).toBe(401);
    });

    test("should reject refresh tokens without a userId or for deleted users", async () => {
      const secret = process.env.JWT_SECRET as string;
      const missingUserIdToken = require("jsonwebtoken").sign({}, secret);

      const missingUserId = await request(testApp)
        .post("/auth/refresh")
        .send({ refreshToken: missingUserIdToken });
      expect(missingUserId.statusCode).toBe(401);

      const deletedUserToken = require("jsonwebtoken").sign(
        { userId: "507f1f77bcf86cd799439099" },
        secret,
      );

      const deletedUser = await request(testApp)
        .post("/auth/refresh")
        .send({ refreshToken: deletedUserToken });
      expect(deletedUser.statusCode).toBe(401);
    });
  });

  describe("POST /auth/google", () => {
    test("should return 422 when credential is missing", async () => {
      const response = await request(testApp).post("/auth/google").send({});

      expect(response.statusCode).toBe(422);
      expect(response.body).toEqual({
        error: "Google credential is required",
      });
    });

    test("should validate missing client id and invalid payload", async () => {
      const originalClientId = process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_ID;

      const missingClientId = await request(testApp).post("/auth/google").send({
        credential: "mock-google-credential",
      });
      expect(missingClientId.statusCode).toBe(500);

      process.env.GOOGLE_CLIENT_ID = originalClientId;

      const verifyIdTokenSpy = jest
        .spyOn(OAuth2Client.prototype, "verifyIdToken")
        .mockImplementation(
          async () =>
            ({
              getPayload: () => ({}),
            }) as any,
        );

      const invalidPayload = await request(testApp).post("/auth/google").send({
        credential: "mock-google-credential",
      });
      expect(invalidPayload.statusCode).toBe(401);

      verifyIdTokenSpy.mockRestore();
    });

    test("should normalize username for a new Google user", async () => {
      const verifyIdTokenSpy = jest
        .spyOn(OAuth2Client.prototype, "verifyIdToken")
        .mockImplementation(
          async () =>
            ({
              getPayload: () => ({
                email: "google-normalized@example.com",
                name: "John Doe! 2026",
                picture: "https://example.com/avatar.png",
              }),
            }) as any,
        );

      const response = await request(testApp).post("/auth/google").send({
        credential: "mock-google-credential",
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body.user).toMatchObject({
        email: "google-normalized@example.com",
        username: "john_doe_2026",
      });

      verifyIdTokenSpy.mockRestore();
    });

    test("should update missing profile fields for an existing Google user", async () => {
      await User.create({
        username: "gseeduser",
        displayName: "Seed User",
        email: "google-existing@example.com",
        password: "placeholder-password",
        photoUrl: "https://example.com/seed.png",
        refreshToken: [],
      });

      await User.updateOne(
        { email: "google-existing@example.com" },
        { $set: { username: "", displayName: "", photoUrl: "" } },
      );

      const verifyIdTokenSpy = jest
        .spyOn(OAuth2Client.prototype, "verifyIdToken")
        .mockImplementation(
          async () =>
            ({
              getPayload: () => ({
                email: "google-existing@example.com",
                name: "Recover Me",
                picture: "https://example.com/recovered.png",
              }),
            }) as any,
        );

      const response = await request(testApp).post("/auth/google").send({
        credential: "mock-google-credential",
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.user).toMatchObject({
        email: "google-existing@example.com",
        username: "recover_me",
        photoUrl: "https://example.com/recovered.png",
      });

      verifyIdTokenSpy.mockRestore();
    });

    test("should append a suffix when a Google username already exists", async () => {
      await User.create({
        username: "collide_2026",
        displayName: "Existing Collision",
        email: "existing-collision@example.com",
        password: "placeholder-password",
        photoUrl: "https://example.com/existing.png",
        refreshToken: [],
      });

      const verifyIdTokenSpy = jest
        .spyOn(OAuth2Client.prototype, "verifyIdToken")
        .mockImplementation(
          async () =>
            ({
              getPayload: () => ({
                email: "google-collision@example.com",
                name: "Collide 2026",
                picture: "https://example.com/avatar2.png",
              }),
            }) as any,
        );

      const response = await request(testApp).post("/auth/google").send({
        credential: "mock-google-credential",
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.user).toHaveProperty("username", "collide_2026 1");

      verifyIdTokenSpy.mockRestore();
    });
  });

  describe("POST /auth/logout", () => {
    test("should logout successfully and handle errors", async () => {
      const loginResponse = await request(testApp)
        .post("/auth/login")
        .send({ identifier: userData.username, password: userData.password });

      const response = await request(testApp)
        .post("/auth/logout")
        .send({ refreshToken: loginResponse.body.refreshToken });
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("message");

      const missingToken = await request(testApp).post("/auth/logout").send({});
      expect(missingToken.statusCode).toBe(422);

      const invalidToken = await request(testApp)
        .post("/auth/logout")
        .send({ refreshToken: "invalid-token" });
      expect(invalidToken.statusCode).toBe(401);
    });

    test("should return 500 when logout secret is missing", async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const response = await request(testApp)
        .post("/auth/logout")
        .send({ refreshToken: "whatever" });

      expect(response.statusCode).toBe(500);
      process.env.JWT_SECRET = originalSecret;
    });

    test("should reject logout tokens without a userId or for deleted users", async () => {
      const secret = process.env.JWT_SECRET as string;
      const missingUserIdToken = require("jsonwebtoken").sign({}, secret);

      const missingUserId = await request(testApp)
        .post("/auth/logout")
        .send({ refreshToken: missingUserIdToken });
      expect(missingUserId.statusCode).toBe(401);

      const deletedUserToken = require("jsonwebtoken").sign(
        { userId: "507f1f77bcf86cd799439098" },
        secret,
      );

      const deletedUser = await request(testApp)
        .post("/auth/logout")
        .send({ refreshToken: deletedUserToken });
      expect(deletedUser.statusCode).toBe(401);
    });
  });
});
