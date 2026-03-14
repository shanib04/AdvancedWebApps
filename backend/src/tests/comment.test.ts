import request from "supertest";
import app from "../index";
import { Express } from "express";
import { cleanupDatabase, registerTestUser, TestUser } from "./testUtils";

let testApp: Express;
let userA: TestUser;
let userB: TestUser;
let userC: TestUser;
let postId: string;

const authHeader = (user: TestUser) => ({
  Authorization: `Bearer ${user.accessToken}`,
});

beforeAll(async () => {
  testApp = app;
  await cleanupDatabase();
  userA = await registerTestUser(testApp);

  const registerB = await request(testApp).post("/auth/register").send({
    username: "comment_user_b",
    email: "comment_user_b@example.com",
    password: "password123",
  });

  userB = {
    _id: registerB.body.user._id,
    username: "comment_user_b",
    email: "comment_user_b@example.com",
    accessToken: registerB.body.accessToken,
    refreshToken: registerB.body.refreshToken,
  };

  const registerC = await request(testApp).post("/auth/register").send({
    username: "comment_user_c",
    email: "comment_user_c@example.com",
    password: "password123",
  });

  userC = {
    _id: registerC.body.user._id,
    username: "comment_user_c",
    email: "comment_user_c@example.com",
    accessToken: registerC.body.accessToken,
    refreshToken: registerC.body.refreshToken,
  };

  const postResp = await request(testApp)
    .post("/post")
    .set(authHeader(userA))
    .send({ content: "post for comments" });
  postId = postResp.body._id;
}, 30000);

describe("Comment API", () => {
  test("POST /comment should enforce auth and validate payload", async () => {
    const noAuth = await request(testApp)
      .post("/comment")
      .send({ post: postId, content: "x" });
    expect(noAuth.statusCode).toBe(401);

    const missingFields = await request(testApp)
      .post("/comment")
      .set(authHeader(userA))
      .send({ post: postId });
    expect(missingFields.statusCode).toBe(422);

    const invalidParent = await request(testApp)
      .post("/comment")
      .set(authHeader(userA))
      .send({ post: postId, content: "x", parentId: "invalid-id" });
    expect(invalidParent.statusCode).toBe(422);

    const created = await request(testApp)
      .post("/comment")
      .set(authHeader(userB))
      .send({ post: postId, content: "first comment" });
    expect(created.statusCode).toBe(201);
    expect(created.body).toHaveProperty("_id");

    const reply = await request(testApp)
      .post("/comment")
      .set(authHeader(userA))
      .send({
        post: postId,
        content: "reply",
        parentId: created.body._id,
      });
    expect(reply.statusCode).toBe(201);
  });

  test("GET comment endpoints should return data and validate IDs", async () => {
    const created = await request(testApp)
      .post("/comment")
      .set(authHeader(userA))
      .send({ post: postId, content: "read me" });

    const all = await request(testApp).get("/comment").set(authHeader(userA));
    expect(all.statusCode).toBe(200);
    expect(Array.isArray(all.body)).toBe(true);

    const byFilter = await request(testApp)
      .get(`/comment?user=${userA._id}&post=${postId}`)
      .set(authHeader(userA));
    expect(byFilter.statusCode).toBe(200);

    const badUserFilter = await request(testApp)
      .get("/comment?user=invalid-id")
      .set(authHeader(userA));
    expect(badUserFilter.statusCode).toBe(422);

    const badPostFilter = await request(testApp)
      .get(`/comment?user=${userA._id}&post=invalid-id`)
      .set(authHeader(userA));
    expect(badPostFilter.statusCode).toBe(422);

    const byId = await request(testApp)
      .get(`/comment/${created.body._id}`)
      .set(authHeader(userA));
    expect(byId.statusCode).toBe(200);

    const invalidById = await request(testApp)
      .get("/comment/invalid-id")
      .set(authHeader(userA));
    expect(invalidById.statusCode).toBe(422);

    const missingById = await request(testApp)
      .get("/comment/507f1f77bcf86cd799439099")
      .set(authHeader(userA));
    expect(missingById.statusCode).toBe(404);

    const missingPostQuery = await request(testApp)
      .get("/comment/post")
      .set(authHeader(userA));
    expect(missingPostQuery.statusCode).toBe(422);

    const invalidPostQuery = await request(testApp)
      .get("/comment/post?postId=invalid-id")
      .set(authHeader(userA));
    expect(invalidPostQuery.statusCode).toBe(422);

    const notFoundPost = await request(testApp)
      .get("/comment/post?postId=507f1f77bcf86cd799439099")
      .set(authHeader(userA));
    expect(notFoundPost.statusCode).toBe(404);

    const byPost = await request(testApp)
      .get(`/comment/post?postId=${postId}`)
      .set(authHeader(userA));
    expect(byPost.statusCode).toBe(200);
    expect(Array.isArray(byPost.body)).toBe(true);
  });

  test("PUT /comment/:id should enforce ownership and update content", async () => {
    const created = await request(testApp)
      .post("/comment")
      .set(authHeader(userB))
      .send({ post: postId, content: "editable comment" });

    const missingContent = await request(testApp)
      .put(`/comment/${created.body._id}`)
      .set(authHeader(userB))
      .send({});
    expect(missingContent.statusCode).toBe(422);

    const invalidId = await request(testApp)
      .put("/comment/invalid-id")
      .set(authHeader(userB))
      .send({ content: "x" });
    expect(invalidId.statusCode).toBe(422);

    const notOwner = await request(testApp)
      .put(`/comment/${created.body._id}`)
      .set(authHeader(userA))
      .send({ content: "cannot edit" });
    expect(notOwner.statusCode).toBe(403);

    const updated = await request(testApp)
      .put(`/comment/${created.body._id}`)
      .set(authHeader(userB))
      .send({ content: "updated by owner" });
    expect(updated.statusCode).toBe(200);
    expect(updated.body).toHaveProperty("content", "updated by owner");
  });

  test("DELETE /comment/:id should respect permissions and cascade replies", async () => {
    const parent = await request(testApp)
      .post("/comment")
      .set(authHeader(userB))
      .send({ post: postId, content: "parent for delete" });

    const child = await request(testApp)
      .post("/comment")
      .set(authHeader(userA))
      .send({
        post: postId,
        content: "child for delete",
        parentId: parent.body._id,
      });

    const invalidId = await request(testApp)
      .delete("/comment/invalid-id")
      .set(authHeader(userA));
    expect(invalidId.statusCode).toBe(422);

    const notFound = await request(testApp)
      .delete("/comment/507f1f77bcf86cd799439099")
      .set(authHeader(userA));
    expect(notFound.statusCode).toBe(404);

    const unauthorized = await request(testApp)
      .delete(`/comment/${parent.body._id}`)
      .set(authHeader(userC));
    expect(unauthorized.statusCode).toBe(403);

    const deletedByPostOwner = await request(testApp)
      .delete(`/comment/${parent.body._id}`)
      .set(authHeader(userA));
    expect(deletedByPostOwner.statusCode).toBe(200);
    expect(deletedByPostOwner.body).toEqual({
      message: "Comment deleted successfully",
    });

    const parentAfter = await request(testApp)
      .get(`/comment/${parent.body._id}`)
      .set(authHeader(userA));
    expect(parentAfter.statusCode).toBe(404);

    const childAfter = await request(testApp)
      .get(`/comment/${child.body._id}`)
      .set(authHeader(userA));
    expect(childAfter.statusCode).toBe(404);
  });
});
