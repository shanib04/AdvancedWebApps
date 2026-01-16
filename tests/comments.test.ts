import request from "supertest";
import app from "../src/server";
import mongoose from "mongoose";
import Comment from "../src/models/commentModel";
import Post from "../src/models/postModel";
import { requireAuth } from "../src/middleware/authMiddleware";

jest.mock("../src/middleware/authMiddleware", () => ({
  requireAuth: (req, res, next) => {
    req.user = { id: new mongoose.Types.ObjectId() };
    next();
  },
}));

// Mock data
const mockUserId = new mongoose.Types.ObjectId();
const mockPostId = new mongoose.Types.ObjectId();
const mockCommentId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  await Post.create({
    _id: mockPostId,
    user: mockUserId,
    content: "Mock post content",
  });

  await Comment.create({
    _id: mockCommentId,
    user: mockUserId,
    post: mockPostId,
    content: "Mock comment content",
  });
});

afterAll(async () => {
  await Comment.deleteMany({});
  await Post.deleteMany({});
  await mongoose.connection.close();
});

describe("Comment Controller Tests", () => {
  test("Create Comment - Valid", async () => {
    const response = await request(app).post("/comment").send({
      post: mockPostId,
      content: "New comment content",
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("_id");
    expect(response.body.content).toBe("New comment content");
  });

  test("Create Comment - Missing Content", async () => {
    const response = await request(app)
      .post("/comment")
      .send({ post: mockPostId });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe("Content is required");
  });

  test("Get All Comments", async () => {
    const response = await request(app).get("/comment");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test("Get Comment by ID - Valid", async () => {
    const response = await request(app).get(`/comment/${mockCommentId}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("_id", mockCommentId.toString());
  });

  test("Delete Comment - Unauthorized", async () => {
    const response = await request(app).delete(`/comment/${mockCommentId}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Unauthorized");
  });
});
