import request from "supertest";
import { Express } from "express";
import User from "../models/userModel";

export interface TestUserData {
  username: string;
  email: string;
  password: string;
  token?: string;
  refreshToken?: string;
}

export interface TestUser {
  _id: string;
  username: string;
  email: string;
  token: string;
  refreshToken: string;
}

export const userData: TestUserData = {
  username: "testuser",
  email: "test@example.com",
  password: "password123",
};

export const additionalUserData: TestUserData = {
  username: "otheruser123",
  email: "other123@example.com",
  password: "password456",
};

export const registerTestUser = async (app: Express): Promise<TestUser> => {
  const response = await request(app).post("/auth/register").send(userData);

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.body.error}`);
  }

  return {
    _id: response.body._id || "testUserId",
    username: userData.username,
    email: userData.email,
    token: response.body.token,
    refreshToken: response.body.refreshToken,
  };
};

export const cleanupDatabase = async (): Promise<void> => {
  await User.deleteMany({});
};
