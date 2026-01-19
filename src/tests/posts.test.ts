import request from "supertest";
import { Express } from "express";
import Post from "../models/postModel";
import mongoose from "mongoose";

const ownerUserId = new mongoose.Types.ObjectId();
const otherUserId = new mongoose.Types.ObjectId();

jest.mock("../middleware/authMiddleware", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    const header = req.headers.authorization;
    if (!header) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (header === "Bearer validToken") {
      req.user = { id: ownerUserId.toString() };
      return next();
    }
    if (header === "Bearer otherToken") {
      req.user = { id: otherUserId.toString() };
      return next();
    }
    return res.status(401).json({ error: "Invalid token" });
  },
}));

let testApp: Express;

const waitForMongooseConnection = async () => {
  if (mongoose.connection.readyState === 1) return;
  await new Promise<void>((resolve) => {
    mongoose.connection.once("connected", () => resolve());
  });
};

interface TestPost {
  _id?: string;
  user?: string;
  content: string;
  createdAt?: Date;
}

const postData: TestPost = {
  content: "This is a test post",
};

const additionalPostData: TestPost = {
  content: "Another test post",
};

beforeAll(async () => {
  const { default: app } = await import("../index");
  testApp = app;
  await waitForMongooseConnection();
  await Post.deleteMany({});
});

describe("Post Controller", () => {
  describe("POST /post", () => {
    test("should create a new post with valid data", async () => {
      const response = await request(testApp)
        .post("/post")
        .set("Authorization", "Bearer validToken")
        .send(postData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty("_id");
      expect(response.body).toHaveProperty("createdAt");
      expect(response.body).toHaveProperty("user", ownerUserId.toString());
      expect(response.body.content).toBe(postData.content);
    });

    test("should return 401 when auth missing", async () => {
      const response = await request(testApp).post("/post").send(postData);
      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty("error", "Authentication required");
    });

    test("should return 422 when content is missing", async () => {
      const testCases = [{}, { content: "" }, { content: null }];

      for (const testCase of testCases) {
        const response = await request(testApp)
          .post("/post")
          .set("Authorization", "Bearer validToken")
          .send(testCase);
        expect(response.statusCode).toBe(422);
      }
    });

    test("should handle special characters and unicode content", async () => {
      const response = await request(testApp)
        .post("/post")
        .set("Authorization", "Bearer validToken")
        .send({ content: "Unicode: 你好世界 🌍 مرحبا !@#$%^&*()" });

      expect(response.statusCode).toBe(201);
    });

    test("should accept very long content", async () => {
      const longContent = "x".repeat(10000);
      const response = await request(testApp)
        .post("/post")
        .set("Authorization", "Bearer validToken")
        .send({ content: longContent });

      expect([201, 422]).toContain(response.statusCode);
    });
  });

  describe("GET /post", () => {
    beforeAll(async () => {
      await Post.deleteMany({});
      await request(testApp)
        .post("/post")
        .set("Authorization", "Bearer validToken")
        .send(postData);
      await request(testApp)
        .post("/post")
        .set("Authorization", "Bearer otherToken")
        .send({ content: "Other user's post" });
    });

    test("should return all posts as an array", async () => {
      const response = await request(testApp).get("/post");

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test("should filter posts by user correctly", async () => {
      const response = await request(testApp)
        .get("/post")
        .query({ user: ownerUserId.toString() });

      expect(response.statusCode).toBe(200);
      expect(
        response.body.every((post: any) => post.user === ownerUserId.toString())
      ).toBe(true);
    });

    test("should return empty array for non-existent user", async () => {
      const response = await request(testApp)
        .get("/post")
        .query({ user: new mongoose.Types.ObjectId().toString() });

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe("GET /post/:id", () => {
    let createdPost: TestPost;

    beforeAll(async () => {
      const response = await request(testApp)
        .post("/post")
        .set("Authorization", "Bearer validToken")
        .send(additionalPostData);
      createdPost = response.body;
    });

    test("should return a post by valid ID", async () => {
      const response = await request(testApp).get("/post/" + createdPost._id);

      expect(response.statusCode).toBe(200);
      expect(response.body._id).toBe(createdPost._id);
      expect(response.body.content).toBe(additionalPostData.content);
      expect(response.body.user).toBe(ownerUserId.toString());
    });

    test("should return 422 for invalid ID format and 404 for non-existent ID", async () => {
      // Invalid format
      const invalidResponse = await request(testApp).get("/post/invalidId");
      expect(invalidResponse.statusCode).toBe(422);

      // Valid format but non-existent
      const fakeId = "507f1f77bcf86cd799439011";
      const notFoundResponse = await request(testApp).get("/post/" + fakeId);
      expect(notFoundResponse.statusCode).toBe(404);
    });

    test("should verify post ID remains immutable", async () => {
      const post1 = await request(testApp)
        .post("/post")
        .set("Authorization", "Bearer validToken")
        .send(postData);
      const post2 = await request(testApp).get("/post/" + post1.body._id);

      expect(post2.statusCode).toBe(200);
      expect(post2.body._id).toBe(post1.body._id);
    });
  });

  describe("GET /post filter validation", () => {
    test("should return 422 for invalid user filter", async () => {
      const response = await request(testApp)
        .get("/post")
        .query({ user: "bad" });
      expect(response.statusCode).toBe(422);
    });
  });

  describe("PUT /post/:id", () => {
    test("should update post successfully with valid data", async () => {
      const createResp = await request(testApp)
        .post("/post")
        .set("Authorization", "Bearer validToken")
        .send(postData);
      const postId = createResp.body._id;
      const updateData = {
        content: "Updated post content",
      };

      const response = await request(testApp)
        .put("/post/" + postId)
        .set("Authorization", "Bearer validToken")
        .send(updateData);

      expect(response.statusCode).toBe(200);
      expect(response.body._id).toBe(postId);
      expect(response.body.content).toBe("Updated post content");
    });

    test("should return 403 when updating someone else's post", async () => {
      const createResp = await request(testApp)
        .post("/post")
        .set("Authorization", "Bearer validToken")
        .send({ content: "Owner post" });
      const postId = createResp.body._id;

      const response = await request(testApp)
        .put("/post/" + postId)
        .set("Authorization", "Bearer otherToken")
        .send({ content: "Attempted update" });

      expect(response.statusCode).toBe(403);
      expect(response.body).toHaveProperty("error", "Unauthorized");
    });

    test("should return 422 when required fields are missing on update", async () => {
      const createResp = await request(testApp)
        .post("/post")
        .set("Authorization", "Bearer validToken")
        .send({ content: "Post to update" });
      const postId = createResp.body._id;

      const response = await request(testApp)
        .put("/post/" + postId)
        .set("Authorization", "Bearer validToken")
        .send({});
      expect(response.statusCode).toBe(422);
    });

    test("should return 422 for invalid ID format and 404 for non-existent ID on update", async () => {
      // Invalid format
      const invalidResponse = await request(testApp)
        .put("/post/invalidId")
        .set("Authorization", "Bearer validToken")
        .send({ content: "Updated content" });
      expect(invalidResponse.statusCode).toBe(422);

      // Valid format but non-existent
      const fakeId = "507f1f77bcf86cd799439011";
      const notFoundResponse = await request(testApp)
        .put("/post/" + fakeId)
        .set("Authorization", "Bearer validToken")
        .send({ content: "Updated content" });
      expect(notFoundResponse.statusCode).toBe(404);
    });

    test("should handle special characters in updated content", async () => {
      const createResp = await request(testApp)
        .post("/post")
        .set("Authorization", "Bearer validToken")
        .send(postData);
      const postId = createResp.body._id;
      const specialContent =
        "Content with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?";

      const response = await request(testApp)
        .put("/post/" + postId)
        .set("Authorization", "Bearer validToken")
        .send({ content: specialContent });

      expect(response.statusCode).toBe(200);
      expect(response.body.content).toBe(specialContent);
    });

    test("should maintain data integrity on update", async () => {
      const createResp = await request(testApp)
        .post("/post")
        .set("Authorization", "Bearer validToken")
        .send(postData);
      const originalId = createResp.body._id;

      const updateResponse = await request(testApp)
        .put("/post/" + originalId)
        .set("Authorization", "Bearer validToken")
        .send({ content: "Updated" });

      expect(updateResponse.statusCode).toBe(200);
      expect(updateResponse.body._id).toBe(originalId);
    });
  });

  describe("DELETE /post/:id", () => {
    test("should delete post successfully", async () => {
      const createResp = await request(testApp)
        .post("/post")
        .set("Authorization", "Bearer validToken")
        .send(postData);
      const postId = createResp.body._id;

      const deleteResponse = await request(testApp)
        .delete("/post/" + postId)
        .set("Authorization", "Bearer validToken");

      expect(deleteResponse.statusCode).toBe(200);
    });

    test("should return 403 when deleting someone else's post", async () => {
      const createResp = await request(testApp)
        .post("/post")
        .set("Authorization", "Bearer validToken")
        .send({ content: "Owner post" });
      const postId = createResp.body._id;

      const deleteResponse = await request(testApp)
        .delete("/post/" + postId)
        .set("Authorization", "Bearer otherToken");

      expect(deleteResponse.statusCode).toBe(403);
      expect(deleteResponse.body).toHaveProperty("error", "Unauthorized");
    });
  });

  describe("Concurrent Operations", () => {
    test("should handle concurrent post creation", async () => {
      const posts = [
        { content: "Post 1" },
        { content: "Post 2" },
        { content: "Post 3" },
      ];

      const responses = await Promise.all(
        posts.map((p) =>
          request(testApp)
            .post("/post")
            .set("Authorization", "Bearer validToken")
            .send(p)
        )
      );

      responses.forEach((response) => {
        expect(response.statusCode).toBe(201);
      });
    });
  });
});
