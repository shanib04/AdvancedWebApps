import request from "supertest";
import app from "../index";
import { Express } from "express";
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
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("refreshToken");
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

    test("should handle special characters in username and email", async () => {
      const response = await request(testApp).post("/auth/register").send({
        username: "user@123_test",
        email: "special+chars@example.com",
        password: "pass@123!",
      });
      expect(response.statusCode).toBe(201);
    });
  });

  describe("POST /auth/login", () => {
    test("should login and return tokens", async () => {
      const response = await request(testApp)
        .post("/auth/login")
        .send({ username: userData.username, password: userData.password });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("refreshToken");
    });

    test("should return 422 if required fields are missing", async () => {
      const response = await request(testApp)
        .post("/auth/login")
        .send({ password: "testuser" });

      expect(response.statusCode).toBe(422);
      expect(response.body).toHaveProperty("error");
    });

    test("should return 401 for invalid credentials", async () => {
      const invalidCreds = [
        { username: "nonexistent", password: "password123" },
        { username: userData.username, password: "wrongpassword" },
      ];

      for (const creds of invalidCreds) {
        const response = await request(testApp).post("/auth/login").send(creds);
        expect(response.statusCode).toBe(401);
        expect(response.body.error).toContain("Invalid");
      }
    });
  });

  describe("POST /auth/refresh", () => {
    test("should return new tokens with valid refresh token", async () => {
      const loginResponse = await request(testApp)
        .post("/auth/login")
        .send({ username: userData.username, password: userData.password });

      const response = await request(testApp)
        .post("/auth/refresh")
        .send({ refreshToken: loginResponse.body.refreshToken });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("token");
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
  });

  describe("POST /auth/logout", () => {
    test("should logout successfully and handle errors", async () => {
      const loginResponse = await request(testApp)
        .post("/auth/login")
        .send({ username: userData.username, password: userData.password });

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
  });
});
