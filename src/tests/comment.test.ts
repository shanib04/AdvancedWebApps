import request from "supertest";
import { Express } from "express";
import Post from "../models/postModel";
import Comment from "../models/commentModel";
import mongoose from "mongoose";

let testApp: Express;

interface TestPost {
  _id?: string;
  sender: string;
  content: string;
  createdAt?: Date;
}

interface TestComment {
  _id?: string;
  postId: string;
  sender: string;
  content: string;
  createdAt?: Date;
}

const postData: TestPost = {
  sender: "testuser",
  content: "Test post for comments",
};

const commentData = {
  sender: "commenter",
  content: "This is a test comment",
};

beforeAll(async () => {
  const { default: app } = await import("../index");
  testApp = app;
  await Post.deleteMany({});
  await Comment.deleteMany({});
});

afterAll(async () => {
  await Post.deleteMany({});
  await Comment.deleteMany({});
  await mongoose.connection.close();
});

describe("Comment Controller", () => {
  let testPost: TestPost;
  let testComment: TestComment;

  beforeAll(async () => {
    const response = await request(testApp).post("/post").send(postData);
    testPost = response.body;
  });

  describe("POST /comment", () => {
    test("should create a new comment successfully", async () => {
      const response = await request(testApp)
        .post("/comment")
        .send({
          postId: testPost._id,
          ...commentData,
        });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty("_id");
      expect(response.body).toHaveProperty("postId");
      expect(response.body).toHaveProperty("sender");
      expect(response.body).toHaveProperty("content");
      expect(response.body).toHaveProperty("createdAt");
      expect(response.body.postId).toBe(testPost._id);
      expect(response.body.sender).toBe(commentData.sender);
      expect(response.body.content).toBe(commentData.content);
      testComment = response.body;
    });

    test("should return 422 if required fields are missing (postId, sender, content)", async () => {
      const missingFieldTests = [
        { data: { sender: "commenter", content: "Missing postId" }, field: "postId" },
        { data: { postId: testPost._id, content: "Missing sender" }, field: "sender" },
        { data: { postId: testPost._id, sender: "commenter" }, field: "content" },
      ];

      for (const test of missingFieldTests) {
        const response = await request(testApp)
          .post("/comment")
          .send(test.data);
        expect(response.statusCode).toBe(422);
        expect(response.body.error).toContain("required");
      }
    });

    test("should return 422 if postId format is invalid", async () => {
      const response = await request(testApp)
        .post("/comment")
        .send({
          postId: "invalidId",
          ...commentData,
        });

      expect(response.statusCode).toBe(422);
      expect(response.body.error).toContain("Invalid postId format");
    });

    test("should return 422 if postId, sender, or content is null or empty", async () => {
      const invalidTests = [
        { postId: null, sender: "user", content: "content" },
        { postId: testPost._id, sender: null, content: "content" },
        { postId: testPost._id, sender: "user", content: null },
        { postId: testPost._id, sender: "", content: "content" },
        { postId: testPost._id, sender: "user", content: "" },
      ];

      for (const testData of invalidTests) {
        const response = await request(testApp)
          .post("/comment")
          .send(testData);
        expect(response.statusCode).toBe(422);
      }
    });

    test("should return 404 if post does not exist", async () => {
      const fakePostId = "507f1f77bcf86cd799439011";
      const response = await request(testApp)
        .post("/comment")
        .send({
          postId: fakePostId,
          ...commentData,
        });

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toContain("Post not found");
    });

    test("should handle unicode and special characters in content", async () => {
      const response = await request(testApp).post("/comment").send({
        postId: testPost._id,
        sender: "testuser",
        content: "Unicode: 你好 مرحبا 🎉 !@#$%^&*()",
      });

      expect(response.statusCode).toBe(201);
      expect(response.body.content).toContain("Unicode:");
    });
  });

  describe("GET /comment", () => {
    test("should return all comments without filters", async () => {
      const response = await request(testApp).get("/comment");

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test("should filter comments by sender query parameter", async () => {
      const response = await request(testApp)
        .get("/comment")
        .query({ sender: commentData.sender });

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(
          response.body.every(
            (comment) => comment.sender === commentData.sender
          )
        ).toBe(true);
      }
    });

    test("should filter comments by postId query parameter", async () => {
      const response = await request(testApp)
        .get("/comment")
        .query({ postId: testPost._id });

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test("should return empty array for non-existent sender", async () => {
      const response = await request(testApp)
        .get("/comment")
        .query({ sender: "nonexistentcommenter_" + Date.now() });

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    test("should handle invalid or non-existent postId in query gracefully", async () => {
      const invalidResponse = await request(testApp)
        .get("/comment")
        .query({ postId: "invalidPostId" });

      // May return 200 with empty array or 422 depending on implementation
      expect([200, 422]).toContain(invalidResponse.statusCode);

      const notFoundResponse = await request(testApp)
        .get("/comment")
        .query({ postId: "507f1f77bcf86cd799439011" });

      // May return 200 with empty array or 404 depending on implementation
      expect([200, 404]).toContain(notFoundResponse.statusCode);
    });
  });

  describe("GET /comment/:id", () => {
    test("should return a comment by ID", async () => {
      const response = await request(testApp).get(
        "/comment/" + testComment._id
      );

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("_id");
      expect(response.body._id).toBe(testComment._id);
      expect(response.body.sender).toBe(commentData.sender);
      expect(response.body.content).toBe(commentData.content);
    });

    test("should return 404 if comment does not exist", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      const response = await request(testApp).get("/comment/" + fakeId);

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toContain("Comment not found");
    });

    test("should handle invalid comment ID format", async () => {
      const response = await request(testApp).get("/comment/invalidid");

      expect([404, 500]).toContain(response.statusCode);
    });

    test("should return 200 when accessing /comment/ without ID", async () => {
      const response = await request(testApp).get("/comment/");

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("PUT /comment/:id", () => {
    let commentToUpdate: TestComment;

    beforeAll(async () => {
      const response = await request(testApp).post("/comment").send({
        postId: testPost._id,
        sender: "updatecommenter",
        content: "Comment to update",
      });
      commentToUpdate = response.body;
    });

    test("should update comment successfully with valid data", async () => {
      const updateData = {
        sender: "updatecommenter",
        content: "Updated comment content",
      };

      const response = await request(testApp)
        .put("/comment/" + commentToUpdate._id)
        .send(updateData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("_id");
      expect(response.body._id).toBe(commentToUpdate._id);
      expect(response.body.sender).toBe("updatecommenter");
      expect(response.body.content).toBe("Updated comment content");
    });

    test("should return 422 if sender or content is missing or invalid", async () => {
      const invalidUpdateTests = [
        { content: "Missing sender" },
        { sender: "commenter" },
        { sender: null, content: "Updated" },
        { sender: "user", content: null },
        { sender: "", content: "Updated" },
        { sender: "user", content: "" },
      ];

      for (const updateData of invalidUpdateTests) {
        const response = await request(testApp)
          .put("/comment/" + commentToUpdate._id)
          .send(updateData);

        expect(response.statusCode).toBe(422);
        expect(response.body.error).toContain("required");
      }
    });

    test("should return 404 if comment does not exist", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      const response = await request(testApp)
        .put("/comment/" + fakeId)
        .send({ sender: "commenter", content: "Updated" });

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toContain("Comment not found");
    });

    test("should handle invalid comment ID format", async () => {
      const response = await request(testApp)
        .put("/comment/invalidid")
        .send({ sender: "user", content: "Updated" });

      expect([404, 500]).toContain(response.statusCode);
    });

    test("should maintain comment ID immutability after update", async () => {
      const createResponse = await request(testApp).post("/comment").send({
        postId: testPost._id,
        sender: "idtest",
        content: "Original comment",
      });

      const originalId = createResponse.body._id;

      const updateResponse = await request(testApp)
        .put("/comment/" + originalId)
        .send({
          sender: "idtest",
          content: "Updated comment",
        });

      expect(updateResponse.statusCode).toBe(200);
      expect(updateResponse.body._id).toBe(originalId);
    });
  });

  describe("DELETE /comment/:id", () => {
    let commentToDelete: TestComment;

    beforeAll(async () => {
      const response = await request(testApp).post("/comment").send({
        postId: testPost._id,
        sender: "deletecommenter",
        content: "Comment to delete",
      });
      commentToDelete = response.body;
    });

    test("should delete comment successfully", async () => {
      const response = await request(testApp).delete(
        "/comment/" + commentToDelete._id
      );

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("successfully");
      expect(response.body).toHaveProperty("comment");
    });

    test("should verify deleted comment is not retrievable", async () => {
      const createResponse = await request(testApp).post("/comment").send({
        postId: testPost._id,
        sender: "deleteverify",
        content: "To be deleted",
      });

      const commentId = createResponse.body._id;

      // Delete comment
      const deleteResponse = await request(testApp).delete(
        "/comment/" + commentId
      );

      expect(deleteResponse.statusCode).toBe(200);

      // Try to fetch deleted comment
      const getResponse = await request(testApp).get("/comment/" + commentId);

      expect(getResponse.statusCode).toBe(404);
    });

    test("should return 404 if comment does not exist", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      const response = await request(testApp).delete("/comment/" + fakeId);

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toContain("Comment not found");
    });

    test("should handle invalid comment ID format", async () => {
      const response = await request(testApp).delete("/comment/invalidid");

      expect([404, 500]).toContain(response.statusCode);
    });

    test("should return 404 when deleting with missing ID", async () => {
      const response = await request(testApp).delete("/comment/");

      expect(response.statusCode).toBe(404);
    });
  });

  describe("Edge Cases and Data Persistence", () => {
    test("should handle multiple comments on a single post", async () => {
      const newPost = await Post.create({
        sender: "multicommenttest",
        content: "Post for multiple comments",
      });

      const comments = [
        { sender: "user1", content: "First comment" },
        { sender: "user2", content: "Second comment" },
        { sender: "user3", content: "Third comment" },
      ];

      const createdComments = await Promise.all(
        comments.map((c) =>
          request(testApp)
            .post("/comment")
            .send({
              postId: newPost._id,
              ...c,
            })
        )
      );

      createdComments.forEach((response) => {
        expect(response.statusCode).toBe(201);
      });

      // Verify filtering by sender
      const getResponse = await request(testApp)
        .get("/comment")
        .query({ sender: "user1" });

      expect(getResponse.statusCode).toBe(200);
      expect(Array.isArray(getResponse.body)).toBe(true);
    });

    test("should handle concurrent comment creation", async () => {
      const newPost = await Post.create({
        sender: "concurrenttest",
        content: "Post for concurrent comments",
      });

      const comments = [
        { sender: "concurrent1", content: "Comment 1" },
        { sender: "concurrent2", content: "Comment 2" },
        { sender: "concurrent3", content: "Comment 3" },
      ];

      const responses = await Promise.all(
        comments.map((c) =>
          request(testApp)
            .post("/comment")
            .send({
              postId: newPost._id,
              ...c,
            })
        )
      );

      responses.forEach((response) => {
        expect(response.statusCode).toBe(201);
      });
    });

    test("should handle very long comment content", async () => {
      const longContent = "x".repeat(5000);
      const response = await request(testApp).post("/comment").send({
        postId: testPost._id,
        sender: "longcontentuser",
        content: longContent,
      });

      expect([201, 422]).toContain(response.statusCode);
    });

    test("should filter comments accurately by sender", async () => {
      const uniqueSender = "filtertest_" + Date.now();

      const createResponse = await request(testApp).post("/comment").send({
        postId: testPost._id,
        sender: uniqueSender,
        content: "Filtered comment",
      });

      expect(createResponse.statusCode).toBe(201);

      const response = await request(testApp)
        .get("/comment")
        .query({ sender: uniqueSender });

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((comment: any) => {
        expect(comment.sender).toBe(uniqueSender);
      });
    });

    test("should verify comment data persists after retrieval", async () => {
      const commentPayload = {
        postId: testPost._id,
        sender: "persistencetest",
        content: "Test persistence",
      };

      const createResponse = await request(testApp)
        .post("/comment")
        .send(commentPayload);

      expect(createResponse.statusCode).toBe(201);

      const commentId = createResponse.body._id;

      const getResponse = await request(testApp).get("/comment/" + commentId);

      expect(getResponse.statusCode).toBe(200);
      expect(getResponse.body.sender).toBe(commentPayload.sender);
      expect(getResponse.body.content).toBe(commentPayload.content);
    });

    test("should handle post with no comments query", async () => {
      const newPost = await Post.create({
        sender: "nocommentuser",
        content: "Post with no comments",
      });

      const response = await request(testApp)
        .get("/comment")
        .query({ postId: newPost._id });

      expect([200, 404]).toContain(response.statusCode);
    });
  });
});
