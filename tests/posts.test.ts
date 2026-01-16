import request from "supertest";
import app from "../src/server";
import mongoose from "mongoose";
import Post from "../src/models/postModel";
import Comment from "../src/models/commentModel";
import { requireAuth } from "../src/middleware/authMiddleware";

jest.mock("../src/middleware/authMiddleware", () => ({
  requireAuth: (req, res, next) => {
    if (req.headers.authorization === "Bearer validToken") {
      req.user = { id: mockUserId };
      next();
    } else if (req.headers.authorization === "Bearer invalidToken") {
      req.user = undefined;
      next();
    } else {
      return res.status(401).json({ error: "Authentication required" });
    }
  },
}));

// Mock data
const mockUserId = new mongoose.Types.ObjectId();
const mockPostId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  await Post.create({
    _id: mockPostId,
    user: mockUserId,
    content: "Mock post content",
  });
});

afterAll(async () => {
  await Comment.deleteMany({});
  await Post.deleteMany({});
  await mongoose.connection.close();
});

describe("Post Controller Tests", () => {
  test("Create Post - Valid", async () => {
    const response = await request(app)
      .post("/post")
      .set("Authorization", `Bearer validToken`)
      .send({
        content: "New post content",
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("_id");
    expect(response.body.content).toBe("New post content");
  });

  test("Create Post - Missing Token", async () => {
    const response = await request(app)
      .post("/post")
      .send({ content: "Test Post" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Authentication required");
  });

  test("Get All Posts", async () => {
    const response = await request(app).get("/post");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test("Get Post by ID - Valid", async () => {
    const response = await request(app).get(`/post/${mockPostId}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("_id", mockPostId.toString());
  });

  test("Delete Post - Unauthorized", async () => {
    await Post.deleteOne({ _id: mockPostId }); // Remove existing mockPostId

    await Post.create({
      _id: mockPostId,
      user: mockUserId,
      content: "Mock post content",
    });

    const response = await request(app)
      .delete(`/post/${mockPostId}`)
      .set("Authorization", `Bearer invalidToken`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Unauthorized");
  });
});
