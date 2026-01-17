import request from "supertest";
import app from "../index";
import User from "../models/userModel";
import { Express } from "express";
import { userData, registerTestUser, cleanupDatabase } from "./testUtils";

let testApp: Express;

beforeAll(async () => {
  testApp = app;
  await cleanupDatabase();
  await registerTestUser(testApp);
}, 30000);

afterAll((done) => {
  done();
});

describe("Auth Controller", () => {
  describe("POST /auth/register", () => {
    test("should register a new user successfully", async () => {
      const newUser = {
        username: "newregisteruser",
        email: "newregister@example.com",
        password: "password123",
      };

      const response = await request(testApp)
        .post("/auth/register")
        .send(newUser);

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

    test("should return 409 if username already exists", async () => {
      const response = await request(testApp).post("/auth/register").send({
        username: userData.username,
        email: "newemail@example.com",
        password: "password123",
      });

      expect(response.statusCode).toBe(409);
      expect(response.body.error).toContain("Username");
    });

    test("should return 409 if email already exists", async () => {
      const response = await request(testApp).post("/auth/register").send({
        username: "uniqueuser",
        email: userData.email,
        password: "password123",
      });

      expect(response.statusCode).toBe(409);
      expect(response.body.error).toContain("Email");
    });

    test("should handle registration with special characters", async () => {
      const response = await request(testApp).post("/auth/register").send({
        username: "user@123_test",
        email: "special+chars@example.com",
        password: "pass@123!",
      });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty("token");
    });
  });

  describe("POST /auth/login", () => {
    test("should login successfully with correct credentials", async () => {
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
        const response = await request(testApp)
          .post("/auth/login")
          .send(creds);
        expect(response.statusCode).toBe(401);
        expect(response.body.error).toContain("Invalid");
      }
    });
  });

  describe("POST /auth/refresh", () => {
    let validRefreshToken: string;

    beforeAll(async () => {
      const loginResponse = await request(testApp)
        .post("/auth/login")
        .send({ username: userData.username, password: userData.password });
      validRefreshToken = loginResponse.body.refreshToken;
    });

    test("should return new tokens with valid refresh token", async () => {
      const response = await request(testApp)
        .post("/auth/refresh")
        .send({ refreshToken: validRefreshToken });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("refreshToken");
    });

    test("should return 401 if refresh token is invalid or missing", async () => {
      const response = await request(testApp)
        .post("/auth/refresh")
        .send({ refreshToken: "invalid-token" });

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    test("should handle expired tokens", async () => {
      const expiredToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjB9.invalid";
      const response = await request(testApp)
        .post("/auth/refresh")
        .send({ refreshToken: expiredToken });

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /auth/logout", () => {
    let logoutRefreshToken: string;

    beforeAll(async () => {
      const loginResponse = await request(testApp)
        .post("/auth/login")
        .send({ username: userData.username, password: userData.password });
      logoutRefreshToken = loginResponse.body.refreshToken;
    });

    test("should logout successfully", async () => {
      const response = await request(testApp)
        .post("/auth/logout")
        .send({ refreshToken: logoutRefreshToken });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("message");
    });

    test("should return 422 if refresh token is missing", async () => {
      const response = await request(testApp).post("/auth/logout").send({});

      expect(response.statusCode).toBe(422);
      expect(response.body).toHaveProperty("error");
    });

    test("should return 401 if refresh token is invalid or expired", async () => {
      const response = await request(testApp)
        .post("/auth/logout")
        .send({ refreshToken: "invalid-token" });

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });
});
