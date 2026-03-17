import request from "supertest";
import app from "../index";
import { Express } from "express";
import mongoose from "mongoose";
import Like from "../models/likeModel";
import Save from "../models/saveModel";
import { cleanupDatabase, registerTestUser, TestUser } from "./testUtils";

let testApp: Express;
let userA: TestUser;
let userB: TestUser;

const authHeader = (user: TestUser) => ({
  Authorization: `Bearer ${user.accessToken}`,
});

const createPostAs = async (user: TestUser, content: string) =>
  request(testApp).post("/post").set(authHeader(user)).send({ content });

beforeAll(async () => {
  testApp = app;
  await cleanupDatabase();
  userA = await registerTestUser(testApp);

  const registerB = await request(testApp).post("/auth/register").send({
    username: "post_user_b",
    email: "post_user_b@example.com",
    password: "password123",
  });

  userB = {
    _id: registerB.body.user._id,
    username: "post_user_b",
    email: "post_user_b@example.com",
    accessToken: registerB.body.accessToken,
    refreshToken: registerB.body.refreshToken,
  };
}, 30000);

describe("Post API", () => {
  test("POST /post should enforce auth, validate content, and create a post", async () => {
    const noAuth = await request(testApp).post("/post").send({ content: "x" });
    expect(noAuth.statusCode).toBe(401);

    const missingContent = await request(testApp)
      .post("/post")
      .set(authHeader(userA))
      .send({});
    expect(missingContent.statusCode).toBe(422);

    const created = await createPostAs(userA, "hello from user A");
    expect(created.statusCode).toBe(201);
    expect(created.body).toHaveProperty("_id");
    expect(created.body).toHaveProperty("content", "hello from user A");
  });

  test("GET /post and GET /post/:id should validate IDs and return expected data", async () => {
    const postA = await createPostAs(userA, "feed A");

    const all = await request(testApp).get("/post").set(authHeader(userA));
    expect(all.statusCode).toBe(200);
    expect(Array.isArray(all.body)).toBe(true);
    expect(all.body.length).toBeGreaterThan(0);
    expect(all.body[0]).toHaveProperty("isLiked");
    expect(all.body[0]).toHaveProperty("isSaved");

    const filtered = await request(testApp)
      .get(`/post?user=${userA._id}`)
      .set(authHeader(userA));
    expect(filtered.statusCode).toBe(200);
    expect(Array.isArray(filtered.body)).toBe(true);

    const invalidFilter = await request(testApp)
      .get("/post?user=invalid-id")
      .set(authHeader(userA));
    expect(invalidFilter.statusCode).toBe(422);

    const invalidId = await request(testApp)
      .get("/post/invalid-id")
      .set(authHeader(userA));
    expect(invalidId.statusCode).toBe(422);

    const notFound = await request(testApp)
      .get("/post/507f1f77bcf86cd799439099")
      .set(authHeader(userA));
    expect(notFound.statusCode).toBe(404);

    const byId = await request(testApp)
      .get(`/post/${postA.body._id}`)
      .set(authHeader(userA));
    expect(byId.statusCode).toBe(200);
    expect(byId.body).toHaveProperty("_id", postA.body._id);
    expect(byId.body).toHaveProperty("isLiked", false);
    expect(byId.body).toHaveProperty("isSaved", false);
  });

  test("PUT /post/:id should enforce ownership and update post", async () => {
    const postA = await createPostAs(userA, "original content");

    const missingContent = await request(testApp)
      .put(`/post/${postA.body._id}`)
      .set(authHeader(userA))
      .send({});
    expect(missingContent.statusCode).toBe(422);

    const notOwner = await request(testApp)
      .put(`/post/${postA.body._id}`)
      .set(authHeader(userB))
      .send({ content: "hijack" });
    expect(notOwner.statusCode).toBe(403);

    const updated = await request(testApp)
      .put(`/post/${postA.body._id}`)
      .set(authHeader(userA))
      .send({
        content: "updated content",
        imageUrl: "https://example.com/updated.png",
      });
    expect(updated.statusCode).toBe(200);
    expect(updated.body).toHaveProperty("content", "updated content");
    expect(updated.body).toHaveProperty(
      "imageUrl",
      "https://example.com/updated.png",
    );

    const missingPost = await request(testApp)
      .put("/post/507f1f77bcf86cd799439097")
      .set(authHeader(userA))
      .send({ content: "still missing" });
    expect(missingPost.statusCode).toBe(404);
  });

  test("POST /post/:id/like and /save plus liked/saved lists should work", async () => {
    const postB = await createPostAs(userB, "liked and saved target");

    const likeResp = await request(testApp)
      .post(`/post/${postB.body._id}/like`)
      .set(authHeader(userA));
    expect(likeResp.statusCode).toBe(200);
    expect(likeResp.body).toHaveProperty("post");

    const saveResp = await request(testApp)
      .post(`/post/${postB.body._id}/save`)
      .set(authHeader(userA));
    expect(saveResp.statusCode).toBe(200);
    expect(saveResp.body).toHaveProperty("post");

    const byIdAfterToggle = await request(testApp)
      .get(`/post/${postB.body._id}`)
      .set(authHeader(userA));
    expect(byIdAfterToggle.body).toHaveProperty("isLiked", true);
    expect(byIdAfterToggle.body).toHaveProperty("isSaved", true);

    const liked = await request(testApp)
      .get(`/post/user/${userA._id}/liked`)
      .set(authHeader(userA));
    expect(liked.statusCode).toBe(200);
    expect(Array.isArray(liked.body)).toBe(true);
    expect(
      liked.body.some((p: { _id: string }) => p._id === postB.body._id),
    ).toBe(true);

    const saved = await request(testApp)
      .get(`/post/user/${userA._id}/saved`)
      .set(authHeader(userA));
    expect(saved.statusCode).toBe(200);
    expect(Array.isArray(saved.body)).toBe(true);
    expect(
      saved.body.some((p: { _id: string }) => p._id === postB.body._id),
    ).toBe(true);

    const unlikeResp = await request(testApp)
      .post(`/post/${postB.body._id}/like`)
      .set(authHeader(userA));
    expect(unlikeResp.statusCode).toBe(200);
    expect(unlikeResp.body.message).toBe("Post unliked");

    const unsaveResp = await request(testApp)
      .post(`/post/${postB.body._id}/save`)
      .set(authHeader(userA));
    expect(unsaveResp.statusCode).toBe(200);
    expect(unsaveResp.body.message).toBe("Post unsaved");

    const byIdAfterUntoggle = await request(testApp)
      .get(`/post/${postB.body._id}`)
      .set(authHeader(userA));
    expect(byIdAfterUntoggle.body).toHaveProperty("isLiked", false);
    expect(byIdAfterUntoggle.body).toHaveProperty("isSaved", false);

    const invalidLikedUser = await request(testApp)
      .get("/post/user/invalid-id/liked")
      .set(authHeader(userA));
    expect(invalidLikedUser.statusCode).toBe(422);

    const invalidSaveId = await request(testApp)
      .post("/post/invalid-id/save")
      .set(authHeader(userA));
    expect(invalidSaveId.statusCode).toBe(422);

    const likeMissingPost = await request(testApp)
      .post("/post/507f1f77bcf86cd799439096/like")
      .set(authHeader(userA));
    expect(likeMissingPost.statusCode).toBe(404);

    const saveMissingPost = await request(testApp)
      .post("/post/507f1f77bcf86cd799439096/save")
      .set(authHeader(userA));
    expect(saveMissingPost.statusCode).toBe(404);

    const unauthorizedLikedUser = await request(testApp)
      .get(`/post/user/${userB._id}/liked`)
      .set(authHeader(userA));
    expect(unauthorizedLikedUser.statusCode).toBe(403);

    const unauthorizedSavedUser = await request(testApp)
      .get(`/post/user/${userB._id}/saved`)
      .set(authHeader(userA));
    expect(unauthorizedSavedUser.statusCode).toBe(403);

    await Like.create({
      userId: userA._id,
      postId: new mongoose.Types.ObjectId(),
    });
    await Save.create({
      userId: userA._id,
      postId: new mongoose.Types.ObjectId(),
    });

    const likedWithDanglingPost = await request(testApp)
      .get(`/post/user/${userA._id}/liked`)
      .set(authHeader(userA));
    expect(likedWithDanglingPost.statusCode).toBe(200);

    const savedWithDanglingPost = await request(testApp)
      .get(`/post/user/${userA._id}/saved`)
      .set(authHeader(userA));
    expect(savedWithDanglingPost.statusCode).toBe(200);
  });

  test("DELETE /post/:id should enforce ownership and remove post", async () => {
    const postA = await createPostAs(userA, "to be deleted");

    const comment = await request(testApp)
      .post("/comment")
      .set(authHeader(userB))
      .send({ post: postA.body._id, content: "linked comment" });
    expect(comment.statusCode).toBe(201);

    const notOwner = await request(testApp)
      .delete(`/post/${postA.body._id}`)
      .set(authHeader(userB));
    expect(notOwner.statusCode).toBe(403);

    const deleted = await request(testApp)
      .delete(`/post/${postA.body._id}`)
      .set(authHeader(userA));
    expect(deleted.statusCode).toBe(200);
    expect(deleted.body).toEqual({
      message: "Post and related comments deleted successfully",
    });

    const afterDelete = await request(testApp)
      .get(`/post/${postA.body._id}`)
      .set(authHeader(userA));
    expect(afterDelete.statusCode).toBe(404);
  });
});
