import type { Response } from "express";

// Ensure route file is executed for coverage.
import "../routes/commentRoutes";

import Post from "../models/postModel";
import Comment from "../models/commentModel";
import {
  createComment,
  deleteComment,
  getAllComments,
  getCommentById,
  getCommentsByPost,
  updateComment,
} from "../controllers/commentController";

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

describe("commentController coverage", () => {
  const validId = "507f1f77bcf86cd799439011";

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("createComment", () => {
    test("validates input/auth and handles success/error", async () => {
      const resMissing = mockRes();
      await createComment({ body: {} } as any, resMissing);
      expectStatusJson(resMissing, 422, {
        error: "Post ID and content are required",
      });

      const resMissingContent = mockRes();
      await createComment(
        { body: { postId: validId } } as any,
        resMissingContent,
      );
      expectStatusJson(resMissingContent, 422, {
        error: "Post ID and content are required",
      });

      const resInvalidPost = mockRes();
      await createComment(
        { body: { post: "bad", content: "x" } } as any,
        resInvalidPost,
      );
      expectStatusJson(resInvalidPost, 422, {
        error: "Invalid Post ID format",
      });

      const postFindByIdSpy = jest.spyOn(Post as any, "findById");

      postFindByIdSpy.mockResolvedValueOnce(null);
      const resNotFound = mockRes();
      await createComment(
        { body: { post: validId, content: "x" }, user: { _id: "u1" } } as any,
        resNotFound,
      );
      expectStatusJson(resNotFound, 404, { error: "Post not found" });

      postFindByIdSpy.mockResolvedValue({ _id: "p1" });
      const resNoUser = mockRes();
      await createComment(
        { body: { postId: validId, content: "x" } } as any,
        resNoUser,
      );
      expectStatusJson(resNoUser, 401, {
        error: "Unauthenticated: User not authenticated",
      });

      const resEmptyUser = mockRes();
      await createComment(
        { body: { postId: validId, content: "x" }, user: {} } as any,
        resEmptyUser,
      );
      expectStatusJson(resEmptyUser, 401, {
        error: "Unauthenticated: User not authenticated",
      });

      const commentCreateSpy = jest.spyOn(Comment as any, "create");

      postFindByIdSpy.mockResolvedValueOnce({ _id: "p1" });
      commentCreateSpy.mockResolvedValueOnce({ _id: "c1" });
      const resOk = mockRes();
      await createComment(
        { body: { post: validId, content: "x" }, user: { _id: "u1" } } as any,
        resOk,
      );
      expect(resOk.status).toHaveBeenCalledWith(201);
      expect(resOk.json).toHaveBeenCalledWith({ _id: "c1" });

      postFindByIdSpy.mockRejectedValueOnce(new Error("boom"));
      const resErr = mockRes();
      await createComment(
        { body: { post: validId, content: "x" }, user: { _id: "u1" } } as any,
        resErr,
      );
      expectStatusJson(resErr, 500, { error: "boom" });
    });
  });

  describe("getAllComments", () => {
    test("validates filters, queries correctly, and handles error", async () => {
      const resBadUser = mockRes();
      await getAllComments({ query: { user: "bad" } } as any, resBadUser);
      expectStatusJson(resBadUser, 422, { error: "Invalid User ID format" });

      const resBadPost = mockRes();
      await getAllComments(
        { query: { user: validId, post: "bad" } } as any,
        resBadPost,
      );
      expectStatusJson(resBadPost, 422, { error: "Invalid Post ID format" });

      const commentFindSpy = jest.spyOn(Comment as any, "find");

      commentFindSpy.mockResolvedValueOnce([]);
      const resNoFilters = mockRes();
      await getAllComments({ query: {} } as any, resNoFilters);
      expect(commentFindSpy).toHaveBeenLastCalledWith({});
      expect(resNoFilters.json).toHaveBeenCalledWith([]);

      commentFindSpy.mockResolvedValueOnce([]);
      const resUserAndPost = mockRes();
      await getAllComments(
        { query: { user: validId, post: validId } } as any,
        resUserAndPost,
      );
      expect(commentFindSpy).toHaveBeenLastCalledWith({
        user: validId,
        post: validId,
      });
      expect(resUserAndPost.json).toHaveBeenCalledWith([]);

      commentFindSpy.mockRejectedValueOnce(new Error("boom"));
      const resErr = mockRes();
      await getAllComments({ query: {} } as any, resErr);
      expectStatusJson(resErr, 500, { error: "boom" });
    });
  });

  describe("getCommentById", () => {
    test("validates id and handles not-found/success/error", async () => {
      const resMissing = mockRes();
      await getCommentById({ params: {} } as any, resMissing);
      expectStatusJson(resMissing, 422, { error: "Comment ID is required" });

      const resInvalid = mockRes();
      await getCommentById({ params: { id: "bad" } } as any, resInvalid);
      expectStatusJson(resInvalid, 422, { error: "Invalid Comment ID format" });

      const commentFindByIdSpy = jest.spyOn(Comment as any, "findById");

      commentFindByIdSpy.mockResolvedValueOnce(null);
      const resNotFound = mockRes();
      await getCommentById({ params: { id: validId } } as any, resNotFound);
      expectStatusJson(resNotFound, 404, { error: "Comment not found" });

      commentFindByIdSpy.mockResolvedValueOnce({ _id: "c1" });
      const resOk = mockRes();
      await getCommentById({ params: { id: validId } } as any, resOk);
      expect(resOk.json).toHaveBeenCalledWith({ _id: "c1" });

      commentFindByIdSpy.mockRejectedValueOnce(new Error("boom"));
      const resErr = mockRes();
      await getCommentById({ params: { id: validId } } as any, resErr);
      expectStatusJson(resErr, 500, { error: "boom" });
    });
  });

  describe("getCommentsByPost", () => {
    test("validates query, checks post exists, queries comments, handles error", async () => {
      const resMissing = mockRes();
      await getCommentsByPost({ query: {} } as any, resMissing);
      expectStatusJson(resMissing, 422, {
        error: "postId query parameter is required",
      });

      const resInvalid = mockRes();
      await getCommentsByPost({ query: { postId: "bad" } } as any, resInvalid);
      expectStatusJson(resInvalid, 422, { error: "Invalid postId format" });

      const postFindByIdSpy = jest.spyOn(Post as any, "findById");
      const commentFindSpy = jest.spyOn(Comment as any, "find");

      postFindByIdSpy.mockResolvedValueOnce(null);
      const resNotFound = mockRes();
      await getCommentsByPost(
        { query: { postId: validId } } as any,
        resNotFound,
      );
      expectStatusJson(resNotFound, 404, { error: "Post not found" });

      postFindByIdSpy.mockResolvedValueOnce({ _id: "p1" });
      commentFindSpy.mockResolvedValueOnce([{ _id: "c1" }]);
      const resByPostId = mockRes();
      await getCommentsByPost(
        { query: { postId: validId } } as any,
        resByPostId,
      );
      expect(commentFindSpy).toHaveBeenLastCalledWith({ post: validId });
      expect(resByPostId.json).toHaveBeenCalledWith([{ _id: "c1" }]);

      postFindByIdSpy.mockResolvedValueOnce({ _id: "p1" });
      commentFindSpy.mockResolvedValueOnce([{ _id: "c1" }]);
      const resByPost = mockRes();
      await getCommentsByPost({ query: { post: validId } } as any, resByPost);
      expect(commentFindSpy).toHaveBeenLastCalledWith({ post: validId });
      expect(resByPost.json).toHaveBeenCalledWith([{ _id: "c1" }]);

      postFindByIdSpy.mockRejectedValueOnce(new Error("boom"));
      const resErr = mockRes();
      await getCommentsByPost({ query: { postId: validId } } as any, resErr);
      expectStatusJson(resErr, 500, { error: "boom" });
    });
  });

  describe("updateComment", () => {
    test("validates inputs/id and handles auth/not-found", async () => {
      const resMissing = mockRes();
      await updateComment({ params: {}, body: {} } as any, resMissing);
      expectStatusJson(resMissing, 422, {
        error: "Comment ID and content are required",
      });

      const resMissingContent = mockRes();
      await updateComment(
        { params: { id: validId }, body: {} } as any,
        resMissingContent,
      );
      expectStatusJson(resMissingContent, 422, {
        error: "Comment ID and content are required",
      });

      const resInvalidId = mockRes();
      await updateComment(
        { params: { id: "bad" }, body: { content: "x" } } as any,
        resInvalidId,
      );
      expectStatusJson(resInvalidId, 422, {
        error: "Invalid Comment ID format",
      });

      const resNoUser = mockRes();
      await updateComment(
        { params: { id: validId }, body: { content: "x" } } as any,
        resNoUser,
      );
      expectStatusJson(resNoUser, 401, {
        error: "Unauthenticated: User not authenticated",
      });

      const commentFindByIdSpy = jest.spyOn(Comment as any, "findById");
      commentFindByIdSpy.mockResolvedValueOnce(null);

      const resNotFound = mockRes();
      await updateComment(
        {
          params: { id: validId },
          body: { content: "x" },
          user: { _id: "u1" },
        } as any,
        resNotFound,
      );
      expectStatusJson(resNotFound, 404, { error: "Comment not found" });
    });

    test("enforces ownership and handles success/error", async () => {
      const commentFindByIdSpy = jest.spyOn(Comment as any, "findById");

      commentFindByIdSpy.mockResolvedValueOnce({
        user: { toString: () => "u1" },
      });
      const resNotOwner = mockRes();
      await updateComment(
        {
          params: { id: validId },
          body: { content: "x" },
          user: { _id: "u2" },
        } as any,
        resNotOwner,
      );
      expectStatusJson(resNotOwner, 403, { error: "Unauthorized" });

      const commentDoc: any = {
        user: { toString: () => "u1" },
        content: "old",
        save: jest.fn().mockResolvedValue(undefined),
      };
      commentFindByIdSpy.mockResolvedValueOnce(commentDoc);
      const resOk = mockRes();
      await updateComment(
        {
          params: { id: validId },
          body: { content: "new" },
          user: { _id: "u1" },
        } as any,
        resOk,
      );
      expect(commentDoc.save).toHaveBeenCalled();
      expect(resOk.json).toHaveBeenCalledWith(commentDoc);

      commentFindByIdSpy.mockRejectedValueOnce(new Error("boom"));
      const resErr = mockRes();
      await updateComment(
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

  describe("deleteComment", () => {
    test("validates id and auth", async () => {
      const resInvalid = mockRes();
      await deleteComment({ params: { id: "bad" } } as any, resInvalid);
      expectStatusJson(resInvalid, 422, { error: "Invalid Comment ID format" });

      const resNoUser = mockRes();
      await deleteComment({ params: { id: validId } } as any, resNoUser);
      expectStatusJson(resNoUser, 401, {
        error: "Unauthenticated: User not authenticated",
      });

      const resEmptyUser = mockRes();
      await deleteComment(
        { params: { id: validId }, user: {} } as any,
        resEmptyUser,
      );
      expectStatusJson(resEmptyUser, 401, {
        error: "Unauthenticated: User not authenticated",
      });
    });

    test("handles not-found/ownership/success/error", async () => {
      const commentFindByIdSpy = jest.spyOn(Comment as any, "findById");

      commentFindByIdSpy.mockResolvedValueOnce(null);
      const resNotFound = mockRes();
      await deleteComment(
        { params: { id: validId }, user: { _id: "u1" } } as any,
        resNotFound,
      );
      expectStatusJson(resNotFound, 404, { error: "Comment not found" });

      commentFindByIdSpy.mockResolvedValueOnce({
        user: { toString: () => "u1" },
      });
      const resNotOwner = mockRes();
      await deleteComment(
        { params: { id: validId }, user: { _id: "u2" } } as any,
        resNotOwner,
      );
      expectStatusJson(resNotOwner, 403, { error: "Unauthorized" });

      const delCommentDoc: any = {
        user: { toString: () => "u1" },
        deleteOne: jest.fn().mockResolvedValue(undefined),
      };
      commentFindByIdSpy.mockResolvedValueOnce(delCommentDoc);
      const resOk = mockRes();
      await deleteComment(
        { params: { id: validId }, user: { _id: "u1" } } as any,
        resOk,
      );
      expect(delCommentDoc.deleteOne).toHaveBeenCalled();
      expect(resOk.json).toHaveBeenCalledWith({
        message: "Comment deleted successfully",
      });

      commentFindByIdSpy.mockRejectedValueOnce(new Error("boom"));
      const resErr = mockRes();
      await deleteComment(
        { params: { id: validId }, user: { _id: "u1" } } as any,
        resErr,
      );
      expectStatusJson(resErr, 500, { error: "boom" });
    });
  });
});
