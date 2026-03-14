import request from "supertest";
import { Express } from "express";
import User from "../models/userModel";
import Post from "../models/postModel";
import Comment from "../models/commentModel";
import Like from "../models/likeModel";
import Save from "../models/saveModel";

export interface TestUserData {
  username: string;
  email: string;
  password: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface TestUser {
  _id: string;
  username: string;
  email: string;
  accessToken: string;
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
    _id: response.body.user?._id || response.body._id || "testUserId",
    username: userData.username,
    email: userData.email,
    accessToken: response.body.accessToken,
    refreshToken: response.body.refreshToken,
  };
};

export const cleanupDatabase = async (): Promise<void> => {
  // Cleanup test created data
  const testUsers = await User.find(
    { email: /@example\.com$/i },
    { _id: 1 },
  ).lean();

  if (testUsers.length === 0) {
    return;
  }

  const userIds = testUsers.map((u) => u._id);
  const testPosts = await Post.find(
    { user: { $in: userIds } },
    { _id: 1 },
  ).lean();
  const postIds = testPosts.map((p) => p._id);

  await Like.deleteMany({
    $or: [{ userId: { $in: userIds } }, { postId: { $in: postIds } }],
  });
  await Save.deleteMany({
    $or: [{ userId: { $in: userIds } }, { postId: { $in: postIds } }],
  });
  await Comment.deleteMany({
    $or: [{ user: { $in: userIds } }, { post: { $in: postIds } }],
  });
  await Post.deleteMany({ user: { $in: userIds } });
  await User.deleteMany({ _id: { $in: userIds } });
};
