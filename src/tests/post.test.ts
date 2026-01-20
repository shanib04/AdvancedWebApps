import type { Response } from "express";

// Ensure route file is executed for coverage.
import "../routes/postRoutes";

import Post from "../models/postModel";
import Comment from "../models/commentModel";
import {
  createPost,
  deletePost,
  getAllPosts,
  getPostById,
  updatePost,
} from "../controllers/postController";

type MockRes = Response & {
  status: jest.Mock;
  json: jest.Mock;
};

const mockRes = (): MockRes => {
  const res: Partial<MockRes> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as MockRes;
};

const expectStatusJson = (res: MockRes, status: number, json: any) => {
  expect(res.status).toHaveBeenCalledWith(status);
  expect(res.json).toHaveBeenCalledWith(json);
};

describe("postController coverage", () => {
  const validId = "507f1f77bcf86cd799439011";

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("createPost", () => {
    test("validates input/auth and handles success/error", async () => {
      const resMissing = mockRes();
      await createPost({ body: {} } as any, resMissing);
      expectStatusJson(resMissing, 422, { error: "Content is required" });

      const postCreateSpy = jest.spyOn(Post as any, "create");

      postCreateSpy.mockResolvedValueOnce({ _id: "p1" });
      const resOk = mockRes();
      await createPost(
        { body: { content: "x" }, user: { _id: "u1" } } as any,
        resOk,
      );
      expect(resOk.status).toHaveBeenCalledWith(201);
      expect(resOk.json).toHaveBeenCalledWith({ _id: "p1" });

      postCreateSpy.mockRejectedValueOnce(new Error("boom"));
      const resErr = mockRes();
      await createPost(
        { body: { content: "x" }, user: { _id: "u1" } } as any,
        resErr,
      );
      expectStatusJson(resErr, 500, { error: "boom" });
    });
  });

  describe("getAllPosts", () => {
    test("validates filter, queries correctly, and handles error", async () => {
      const resInvalid = mockRes();
      await getAllPosts({ query: { user: "bad" } } as any, resInvalid);
      expectStatusJson(resInvalid, 422, { error: "Invalid User ID format" });

      const postFindSpy = jest.spyOn(Post as any, "find");

      postFindSpy.mockResolvedValueOnce([]);
      const resNoFilter = mockRes();
      await getAllPosts({ query: {} } as any, resNoFilter);
      expect(postFindSpy).toHaveBeenLastCalledWith({});
      expect(resNoFilter.json).toHaveBeenCalledWith([]);

      postFindSpy.mockResolvedValueOnce([]);
      const resWithFilter = mockRes();
      await getAllPosts({ query: { user: validId } } as any, resWithFilter);
      expect(postFindSpy).toHaveBeenLastCalledWith({ user: validId });
      expect(resWithFilter.json).toHaveBeenCalledWith([]);

      postFindSpy.mockRejectedValueOnce(new Error("boom"));
      const resErr = mockRes();
      await getAllPosts({ query: {} } as any, resErr);
      expectStatusJson(resErr, 500, { error: "boom" });
    });
  });

  describe("getPostById", () => {
    test("validates id and handles not-found/success/error", async () => {
      const resMissing = mockRes();
      await getPostById({ params: {} } as any, resMissing);
      expectStatusJson(resMissing, 422, { error: "Post ID is required" });

      const resInvalid = mockRes();
      await getPostById({ params: { id: "bad" } } as any, resInvalid);
      expectStatusJson(resInvalid, 422, { error: "Invalid Post ID format" });

      const postFindByIdSpy = jest.spyOn(Post as any, "findById");

      postFindByIdSpy.mockResolvedValueOnce(null);
      const resNotFound = mockRes();
      await getPostById({ params: { id: validId } } as any, resNotFound);
      expectStatusJson(resNotFound, 404, { error: "Post not found" });

      postFindByIdSpy.mockResolvedValueOnce({ _id: "p1" });
      const resOk = mockRes();
      await getPostById({ params: { id: validId } } as any, resOk);
      expect(resOk.json).toHaveBeenCalledWith({ _id: "p1" });

      postFindByIdSpy.mockRejectedValueOnce(new Error("boom"));
      const resErr = mockRes();
      await getPostById({ params: { id: validId } } as any, resErr);
      expectStatusJson(resErr, 500, { error: "boom" });
    });
  });

  describe("updatePost", () => {
    test("validates inputs/id and handles not-found", async () => {
      const resMissing = mockRes();
      await updatePost({ params: {}, body: {} } as any, resMissing);
      expectStatusJson(resMissing, 422, {
        error: "Post ID and content are required",
      });

      const resMissingContent = mockRes();
      await updatePost(
        { params: { id: validId }, body: {} } as any,
        resMissingContent,
      );
      expectStatusJson(resMissingContent, 422, {
        error: "Post ID and content are required",
      });

      const resInvalidId = mockRes();
      await updatePost(
        { params: { id: "bad" }, body: { content: "x" } } as any,
        resInvalidId,
      );
      expectStatusJson(resInvalidId, 422, { error: "Invalid Post ID format" });

      const postFindByIdSpy = jest.spyOn(Post as any, "findById");
      postFindByIdSpy.mockResolvedValueOnce(null);

      const resNotFound = mockRes();
      await updatePost(
        { params: { id: validId }, body: { content: "x" } } as any,
        resNotFound,
      );
      expectStatusJson(resNotFound, 404, { error: "Post not found" });
    });

    test("enforces ownership and handles success/error", async () => {
      const postFindByIdSpy = jest.spyOn(Post as any, "findById");

      postFindByIdSpy.mockResolvedValueOnce({});
      const resNoPostUser = mockRes();
      await updatePost(
        {
          params: { id: validId },
          body: { content: "x" },
          user: { _id: "u1" },
        } as any,
        resNoPostUser,
      );
      expectStatusJson(resNoPostUser, 403, { error: "Unauthorized" });

      postFindByIdSpy.mockResolvedValueOnce({ user: { toString: () => "u1" } });
      const resNotOwner = mockRes();
      await updatePost(
        {
          params: { id: validId },
          body: { content: "x" },
          user: { _id: "u2" },
        } as any,
        resNotOwner,
      );
      expectStatusJson(resNotOwner, 403, { error: "Unauthorized" });

      const postDoc: any = {
        user: { toString: () => "u1" },
        content: "old",
        save: jest.fn().mockResolvedValue(undefined),
      };
      postFindByIdSpy.mockResolvedValueOnce(postDoc);
      const resOk = mockRes();
      await updatePost(
        {
          params: { id: validId },
          body: { content: "new" },
          user: { _id: "u1" },
        } as any,
        resOk,
      );
      expect(postDoc.save).toHaveBeenCalled();
      expect(resOk.json).toHaveBeenCalledWith(postDoc);

      postFindByIdSpy.mockRejectedValueOnce(new Error("boom"));
      const resErr = mockRes();
      await updatePost(
        {
          params: { id: validId },
          body: { content: "x" },
          user: { _id: "u1" },
        } as any,
        resErr,
      );
      expectStatusJson(resErr, 500, { error: "boom" });
    });
  });

  describe("deletePost", () => {
    test("validates id and handles not-found", async () => {
      const resInvalid = mockRes();
      await deletePost({ params: { id: "bad" } } as any, resInvalid);
      expectStatusJson(resInvalid, 422, { error: "Invalid Post ID format" });

      const postFindByIdSpy = jest.spyOn(Post as any, "findById");
      postFindByIdSpy.mockResolvedValueOnce(null);

      const resNotFound = mockRes();
      await deletePost({ params: { id: validId } } as any, resNotFound);
      expectStatusJson(resNotFound, 404, { error: "Post not found" });
    });

    test("enforces ownership, cascades delete, and handles error", async () => {
      const postFindByIdSpy = jest.spyOn(Post as any, "findById");

      postFindByIdSpy.mockResolvedValueOnce({});
      const resNoPostUser = mockRes();
      await deletePost(
        { params: { id: validId }, user: { _id: "u1" } } as any,
        resNoPostUser,
      );
      expectStatusJson(resNoPostUser, 403, { error: "Unauthorized" });

      postFindByIdSpy.mockResolvedValueOnce({ user: { toString: () => "u1" } });
      const resNotOwner = mockRes();
      await deletePost(
        { params: { id: validId }, user: { _id: "u2" } } as any,
        resNotOwner,
      );
      expectStatusJson(resNotOwner, 403, { error: "Unauthorized" });

      const delPostDoc: any = {
        user: { toString: () => "u1" },
        deleteOne: jest.fn().mockResolvedValue(undefined),
      };
      const commentDeleteManySpy = jest.spyOn(Comment as any, "deleteMany");

      postFindByIdSpy.mockResolvedValueOnce(delPostDoc);
      commentDeleteManySpy.mockResolvedValueOnce({ deletedCount: 0 });

      const resOk = mockRes();
      await deletePost(
        { params: { id: validId }, user: { _id: "u1" } } as any,
        resOk,
      );
      expect(commentDeleteManySpy).toHaveBeenCalledWith({ post: validId });
      expect(delPostDoc.deleteOne).toHaveBeenCalled();
      expect(resOk.json).toHaveBeenCalledWith({
        message: "Post and related comments deleted successfully",
      });

      postFindByIdSpy.mockRejectedValueOnce(new Error("boom"));
      const resErr = mockRes();
      await deletePost(
        { params: { id: validId }, user: { _id: "u1" } } as any,
        resErr,
      );
      expectStatusJson(resErr, 500, { error: "boom" });
    });
  });
});
