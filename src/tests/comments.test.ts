import request from "supertest";
import { Express } from "express";
import Post from "../models/postModel";
import Comment from "../models/commentModel";
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
let testPost: { _id: string };
let testComment: { _id: string };

const postData = {
  content: "Test post for comments",
};

const commentData = {
  content: "This is a test comment",
};

const waitForMongooseConnection = async () => {
  if (mongoose.connection.readyState === 1) return;
  await new Promise<void>((resolve) => {
    mongoose.connection.once("connected", () => resolve());
  });
};

beforeAll(async () => {
  const { default: app } = await import("../index");
  testApp = app;
  await waitForMongooseConnection();
  await Post.deleteMany({});
  await Comment.deleteMany({});

  const postResp = await request(testApp)
    .post("/post")
    .set("Authorization", "Bearer validToken")
    .send(postData);
  expect(postResp.statusCode).toBe(201);
  expect(postResp.body).toHaveProperty("_id");
  testPost = postResp.body;
});

describe("Comment Controller", () => {
  describe("POST /comment", () => {
    test("should create comment and validate fields", async () => {
      const response = await request(testApp)
        .post("/comment")
        .set("Authorization", "Bearer validToken")
        .send({
          post: testPost._id,
          ...commentData,
        });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty("post", testPost._id);
      expect(response.body).toHaveProperty("user", ownerUserId.toString());
      testComment = response.body;

      const missingFields = [
        { content: "Missing post" },
        { post: testPost._id },
      ];

      for (const test of missingFields) {
        const resp = await request(testApp)
          .post("/comment")
          .set("Authorization", "Bearer validToken")
          .send(test);
        expect(resp.statusCode).toBe(422);
      }

      const badId = await request(testApp)
        .post("/comment")
        .set("Authorization", "Bearer validToken")
        .send({
          post: "invalidId",
          ...commentData,
        });
      expect(badId.statusCode).toBe(422);

      const nullTests = [
        { post: null, content: "content" },
        { post: testPost._id, content: null },
        { post: testPost._id, content: "" },
      ];

      for (const data of nullTests) {
        const resp = await request(testApp)
          .post("/comment")
          .set("Authorization", "Bearer validToken")
          .send(data);
        expect(resp.statusCode).toBe(422);
      }

      const notFound = await request(testApp)
        .post("/comment")
        .set("Authorization", "Bearer validToken")
        .send({
          post: "507f1f77bcf86cd799439011",
          ...commentData,
        });
      expect(notFound.statusCode).toBe(404);

      const unicode = await request(testApp)
        .post("/comment")
        .set("Authorization", "Bearer validToken")
        .send({
          post: testPost._id,
          content: "Unicode: hello world special chars !@#$%^&*()",
        });
      expect(unicode.statusCode).toBe(201);
    });

    test("should return 401 when auth missing", async () => {
      const response = await request(testApp).post("/comment").send({
        post: testPost._id,
        content: "No auth",
      });
      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty("error", "Authentication required");
    });
  });

  describe("GET /comment operations", () => {
    test("should return and filter comments by user and post", async () => {
      const all = await request(testApp).get("/comment");
      expect(all.statusCode).toBe(200);
      expect(Array.isArray(all.body)).toBe(true);

      const byUser = await request(testApp)
        .get("/comment")
        .query({ user: ownerUserId.toString() });
      expect(byUser.statusCode).toBe(200);

      const byPost = await request(testApp)
        .get("/comment")
        .query({ post: testPost._id });
      expect(byPost.statusCode).toBe(200);

      const byPostRoute = await request(testApp)
        .get("/comment/post")
        .query({ postId: testPost._id });
      expect(byPostRoute.statusCode).toBe(200);

      const empty = await request(testApp)
        .get("/comment")
        .query({ user: new mongoose.Types.ObjectId().toString() });
      expect(empty.statusCode).toBe(200);
      expect(empty.body.length).toBe(0);

      const byId = await request(testApp).get("/comment/" + testComment._id);
      expect(byId.statusCode).toBe(200);

      const badId = await request(testApp).get("/comment/invalidid");
      expect(badId.statusCode).toBe(422);

      const notFound = await request(testApp).get(
        "/comment/507f1f77bcf86cd799439011"
      );
      expect(notFound.statusCode).toBe(404);

      const invalidUserFilter = await request(testApp)
        .get("/comment")
        .query({ user: "bad" });
      expect(invalidUserFilter.statusCode).toBe(422);

      const invalidPostFilter = await request(testApp)
        .get("/comment")
        .query({ post: "bad" });
      expect(invalidPostFilter.statusCode).toBe(422);

      const missingPostId = await request(testApp).get("/comment/post");
      expect(missingPostId.statusCode).toBe(422);

      const invalidPostId = await request(testApp)
        .get("/comment/post")
        .query({ postId: "bad" });
      expect(invalidPostId.statusCode).toBe(422);

      const missingPost = await request(testApp)
        .get("/comment/post")
        .query({ postId: "507f1f77bcf86cd799439011" });
      expect(missingPost.statusCode).toBe(404);
    });
  });

  describe("PUT /comment/:id", () => {
    test("should update comment and handle validation/errors", async () => {
      const createResp = await request(testApp)
        .post("/comment")
        .set("Authorization", "Bearer validToken")
        .send({
          post: testPost._id,
          content: "Comment to update",
        });

      if (createResp.statusCode !== 201) {
        // If auth is enforced, ensure the suite fails loudly.
        expect(createResp.statusCode).toBe(201);
        return;
      }

      const update = await request(testApp)
        .put("/comment/" + createResp.body._id)
        .set("Authorization", "Bearer validToken")
        .send({
          content: "Updated content",
        });
      expect(update.statusCode).toBe(200);

      const forbidden = await request(testApp)
        .put("/comment/" + createResp.body._id)
        .set("Authorization", "Bearer otherToken")
        .send({ content: "Not your comment" });
      expect(forbidden.statusCode).toBe(403);

      const invalidTests = [{ content: "" }];

      for (const data of invalidTests) {
        const resp = await request(testApp)
          .put("/comment/" + createResp.body._id)
          .set("Authorization", "Bearer validToken")
          .send(data);
        expect(resp.statusCode).toBe(422);
      }

      const badId = await request(testApp).put("/comment/invalidid").send({
        content: "Updated",
      });
      expect(badId.statusCode).toBe(401);

      const badIdAuthed = await request(testApp)
        .put("/comment/invalidid")
        .set("Authorization", "Bearer validToken")
        .send({ content: "Updated" });
      expect(badIdAuthed.statusCode).toBe(422);

      const notFound = await request(testApp)
        .put("/comment/507f1f77bcf86cd799439011")
        .set("Authorization", "Bearer validToken")
        .send({ content: "Updated" });
      expect(notFound.statusCode).toBe(404);
    });
  });

  describe("DELETE /comment/:id", () => {
    test("should delete comment and verify deletion with error handling", async () => {
      const createResp = await request(testApp)
        .post("/comment")
        .set("Authorization", "Bearer validToken")
        .send({
          post: testPost._id,
          content: "Comment to delete",
        });

      if (createResp.statusCode === 201) {
        const deleteResp = await request(testApp).delete(
          "/comment/" + createResp.body._id
        );
        expect(deleteResp.statusCode).toBe(401);
        // delete requires auth

        const deleteRespAuthed = await request(testApp)
          .delete("/comment/" + createResp.body._id)
          .set("Authorization", "Bearer validToken");
        expect(deleteRespAuthed.statusCode).toBe(200);
        expect(deleteRespAuthed.body).toHaveProperty("message");

        const deleteForbidden = await request(testApp)
          .delete("/comment/" + createResp.body._id)
          .set("Authorization", "Bearer otherToken");
        expect([403, 404]).toContain(deleteForbidden.statusCode);

        const getResp = await request(testApp).get(
          "/comment/" + createResp.body._id
        );
        expect(getResp.statusCode).toBe(404);
      }

      const notFoundResp = await request(testApp)
        .delete("/comment/507f1f77bcf86cd799439011")
        .set("Authorization", "Bearer validToken");
      expect(notFoundResp.statusCode).toBe(404);

      const invalidIdResp = await request(testApp)
        .delete("/comment/invalidid")
        .set("Authorization", "Bearer validToken");
      expect(invalidIdResp.statusCode).toBe(422);

      const noIdResp = await request(testApp).delete("/comment/");
      expect(noIdResp.statusCode).toBe(404);
    });
  });

  describe("Edge Cases", () => {
    test("should handle concurrent creation and long content", async () => {
      const comments = [{ content: "Comment 1" }, { content: "Comment 2" }];

      const responses = await Promise.all(
        comments.map((c) =>
          request(testApp)
            .post("/comment")
            .set("Authorization", "Bearer validToken")
            .send({
              post: testPost._id,
              ...c,
            })
        )
      );

      responses.forEach((response) => {
        expect(response.statusCode).toBe(201);
      });

      const longContent = "x".repeat(5000);
      const longResp = await request(testApp)
        .post("/comment")
        .set("Authorization", "Bearer validToken")
        .send({
          post: testPost._id,
          content: longContent,
        });
      expect([201, 422]).toContain(longResp.statusCode);
    });
  });
});
