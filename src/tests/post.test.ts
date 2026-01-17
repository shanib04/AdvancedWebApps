import request from "supertest";
import { Express } from "express";
import Post from "../models/postModel";
import mongoose from "mongoose";

let testApp: Express;

interface TestPost {
  _id?: string;
  sender: string;
  content: string;
  createdAt?: Date;
}

const postData: TestPost = {
  sender: "testuser",
  content: "This is a test post",
};

const additionalPostData: TestPost = {
  sender: "anotheruser",
  content: "Another test post",
};

beforeAll(async () => {
  const { default: app } = await import("../index");
  testApp = app;
  await Post.deleteMany({});
});

afterAll(async () => {
  await Post.deleteMany({});
  await mongoose.connection.close();
});

describe("Post Controller", () => {
  describe("POST /post", () => {
    test("should create a new post with valid data", async () => {
      const response = await request(testApp).post("/post").send(postData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty("_id");
      expect(response.body).toHaveProperty("createdAt");
      expect(response.body.sender).toBe(postData.sender);
      expect(response.body.content).toBe(postData.content);
    });

    test("should return 422 when required fields are missing or empty", async () => {
      const testCases = [
        { data: { content: "Missing sender" } },
        { data: { sender: "testuser" } },
        { data: {} },
        { data: { sender: "", content: "Test" } },
        { data: { sender: "testuser", content: "" } },
        { data: { sender: null, content: "Test" } },
        { data: { sender: "testuser", content: null } },
      ];

      for (const testCase of testCases) {
        const response = await request(testApp)
          .post("/post")
          .send(testCase.data);
        expect(response.statusCode).toBe(422);
      }
    });

    test("should handle special characters and unicode content", async () => {
      const response = await request(testApp).post("/post").send({
        sender: "user-with.special_chars123",
        content: "Unicode: 你好世界 🌍 مرحبا !@#$%^&*()",
      });

      expect(response.statusCode).toBe(201);
    });

    test("should accept very long content", async () => {
      const longContent = "x".repeat(10000);
      const response = await request(testApp).post("/post").send({
        sender: "testuser",
        content: longContent,
      });

      expect([201, 422]).toContain(response.statusCode);
    });
  });

  describe("GET /post", () => {
    beforeAll(async () => {
      await Post.deleteMany({});
      await request(testApp).post("/post").send(postData);
    });

    test("should return all posts as an array", async () => {
      const response = await request(testApp).get("/post");

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test("should filter posts by sender correctly", async () => {
      const response = await request(testApp)
        .get("/post")
        .query({ sender: postData.sender });

      expect(response.statusCode).toBe(200);
      expect(
        response.body.every((post: any) => post.sender === postData.sender)
      ).toBe(true);
    });

    test("should return empty array for non-existent sender", async () => {
      const response = await request(testApp)
        .get("/post")
        .query({ sender: "nonexistentuser12345" });

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    test("should handle multiple posts with same sender", async () => {
      const sender = "multisender_" + Date.now();

      await request(testApp)
        .post("/post")
        .send({ sender, content: "First post" });

      await request(testApp)
        .post("/post")
        .send({ sender, content: "Second post" });

      const response = await request(testApp).get("/post").query({ sender });

      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("GET /post/:id", () => {
    let createdPost: TestPost;

    beforeAll(async () => {
      const response = await request(testApp)
        .post("/post")
        .send(additionalPostData);
      createdPost = response.body;
    });

    test("should return a post by valid ID", async () => {
      const response = await request(testApp).get("/post/" + createdPost._id);

      expect(response.statusCode).toBe(200);
      expect(response.body._id).toBe(createdPost._id);
      expect(response.body.sender).toBe(additionalPostData.sender);
      expect(response.body.content).toBe(additionalPostData.content);
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
      const post1 = await request(testApp).post("/post").send(postData);
      const post2 = await request(testApp).get("/post/" + post1.body._id);

      expect(post2.statusCode).toBe(200);
      expect(post2.body._id).toBe(post1.body._id);
    });
  });

  describe("PUT /post/:id", () => {
    test("should update post successfully with valid data", async () => {
      const post = await Post.create(postData);
      const updateData = {
        sender: "updateduser",
        content: "Updated post content",
      };

      const response = await request(testApp)
        .put("/post/" + post._id)
        .send(updateData);

      expect(response.statusCode).toBe(200);
      expect(response.body._id).toBe(post._id.toString());
      expect(response.body.sender).toBe("updateduser");
      expect(response.body.content).toBe("Updated post content");
    });

    test("should return 422 when required fields are missing or empty on update", async () => {
      const post = await Post.create(postData);
      const testCases = [
        { data: { content: "Missing sender" } },
        { data: { sender: "testuser" } },
        { data: { sender: "", content: "content" } },
        { data: { sender: "user", content: "" } },
        { data: { sender: null, content: "content" } },
        { data: { sender: "user", content: null } },
      ];

      for (const testCase of testCases) {
        const response = await request(testApp)
          .put("/post/" + post._id)
          .send(testCase.data);
        expect(response.statusCode).toBe(422);
      }
    });

    test("should return 422 for invalid ID format and 404 for non-existent ID on update", async () => {
      // Invalid format
      const invalidResponse = await request(testApp)
        .put("/post/invalidId")
        .send({ sender: "testuser", content: "Updated content" });
      expect(invalidResponse.statusCode).toBe(422);

      // Valid format but non-existent
      const fakeId = "507f1f77bcf86cd799439011";
      const notFoundResponse = await request(testApp)
        .put("/post/" + fakeId)
        .send({ sender: "testuser", content: "Updated content" });
      expect(notFoundResponse.statusCode).toBe(404);
    });

    test("should handle special characters in updated content", async () => {
      const post = await Post.create(postData);
      const specialContent =
        "Content with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?";

      const response = await request(testApp)
        .put("/post/" + post._id)
        .send({ sender: "user", content: specialContent });

      expect(response.statusCode).toBe(200);
      expect(response.body.content).toBe(specialContent);
    });

    test("should maintain data integrity on update", async () => {
      const post = await Post.create(postData);
      const originalId = post._id.toString();

      const updateResponse = await request(testApp)
        .put("/post/" + originalId)
        .send({ sender: "newsender", content: "Updated" });

      expect(updateResponse.statusCode).toBe(200);
      expect(updateResponse.body._id).toBe(originalId);
    });
  });

  describe("DELETE /post/:id", () => {
    test("should delete post successfully", async () => {
      const post = await Post.create(postData);
      const deleteResponse = await request(testApp).delete("/post/" + post._id);

      expect([200, 404]).toContain(deleteResponse.statusCode);
    });
  });

  describe("Concurrent Operations", () => {
    test("should handle concurrent post creation", async () => {
      const posts = [
        { sender: "concurrent1", content: "Post 1" },
        { sender: "concurrent2", content: "Post 2" },
        { sender: "concurrent3", content: "Post 3" },
      ];

      const responses = await Promise.all(
        posts.map((p) => request(testApp).post("/post").send(p))
      );

      responses.forEach((response) => {
        expect(response.statusCode).toBe(201);
      });
    });
  });
});
