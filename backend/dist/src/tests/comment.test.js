"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Ensure route file is executed for coverage.
require("../routes/commentRoutes");
const postModel_1 = __importDefault(require("../models/postModel"));
const commentModel_1 = __importDefault(require("../models/commentModel"));
const commentController_1 = require("../controllers/commentController");
const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};
const expectStatusJson = (res, status, json) => {
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
            await (0, commentController_1.createComment)({ body: {} }, resMissing);
            expectStatusJson(resMissing, 422, {
                error: "Post ID and content are required",
            });
            const resMissingContent = mockRes();
            await (0, commentController_1.createComment)({ body: { postId: validId } }, resMissingContent);
            expectStatusJson(resMissingContent, 422, {
                error: "Post ID and content are required",
            });
            const resInvalidPost = mockRes();
            await (0, commentController_1.createComment)({ body: { post: "bad", content: "x" } }, resInvalidPost);
            expectStatusJson(resInvalidPost, 422, {
                error: "Invalid Post ID format",
            });
            const postFindByIdSpy = jest.spyOn(postModel_1.default, "findById");
            postFindByIdSpy.mockResolvedValueOnce(null);
            const resNotFound = mockRes();
            await (0, commentController_1.createComment)({ body: { post: validId, content: "x" }, user: { _id: "u1" } }, resNotFound);
            expectStatusJson(resNotFound, 404, { error: "Post not found" });
            postFindByIdSpy.mockResolvedValue({ _id: "p1" });
            const commentCreateSpy = jest.spyOn(commentModel_1.default, "create");
            postFindByIdSpy.mockResolvedValueOnce({ _id: "p1" });
            commentCreateSpy.mockResolvedValueOnce({ _id: "c1" });
            const resOk = mockRes();
            await (0, commentController_1.createComment)({ body: { post: validId, content: "x" }, user: { _id: "u1" } }, resOk);
            expect(resOk.status).toHaveBeenCalledWith(201);
            expect(resOk.json).toHaveBeenCalledWith({ _id: "c1" });
            postFindByIdSpy.mockRejectedValueOnce(new Error("boom"));
            const resErr = mockRes();
            await (0, commentController_1.createComment)({ body: { post: validId, content: "x" }, user: { _id: "u1" } }, resErr);
            expectStatusJson(resErr, 500, { error: "boom" });
        });
    });
    describe("getAllComments", () => {
        test("validates filters, queries correctly, and handles error", async () => {
            const resBadUser = mockRes();
            await (0, commentController_1.getAllComments)({ query: { user: "bad" } }, resBadUser);
            expectStatusJson(resBadUser, 422, { error: "Invalid User ID format" });
            const resBadPost = mockRes();
            await (0, commentController_1.getAllComments)({ query: { user: validId, post: "bad" } }, resBadPost);
            expectStatusJson(resBadPost, 422, { error: "Invalid Post ID format" });
            const commentFindSpy = jest.spyOn(commentModel_1.default, "find");
            commentFindSpy.mockResolvedValueOnce([]);
            const resNoFilters = mockRes();
            await (0, commentController_1.getAllComments)({ query: {} }, resNoFilters);
            expect(commentFindSpy).toHaveBeenLastCalledWith({});
            expect(resNoFilters.json).toHaveBeenCalledWith([]);
            commentFindSpy.mockResolvedValueOnce([]);
            const resUserAndPost = mockRes();
            await (0, commentController_1.getAllComments)({ query: { user: validId, post: validId } }, resUserAndPost);
            expect(commentFindSpy).toHaveBeenLastCalledWith({
                user: validId,
                post: validId,
            });
            expect(resUserAndPost.json).toHaveBeenCalledWith([]);
            commentFindSpy.mockRejectedValueOnce(new Error("boom"));
            const resErr = mockRes();
            await (0, commentController_1.getAllComments)({ query: {} }, resErr);
            expectStatusJson(resErr, 500, { error: "boom" });
        });
    });
    describe("getCommentById", () => {
        test("validates id and handles not-found/success/error", async () => {
            const resMissing = mockRes();
            await (0, commentController_1.getCommentById)({ params: {} }, resMissing);
            expectStatusJson(resMissing, 422, { error: "Comment ID is required" });
            const resInvalid = mockRes();
            await (0, commentController_1.getCommentById)({ params: { id: "bad" } }, resInvalid);
            expectStatusJson(resInvalid, 422, { error: "Invalid Comment ID format" });
            const commentFindByIdSpy = jest.spyOn(commentModel_1.default, "findById");
            commentFindByIdSpy.mockResolvedValueOnce(null);
            const resNotFound = mockRes();
            await (0, commentController_1.getCommentById)({ params: { id: validId } }, resNotFound);
            expectStatusJson(resNotFound, 404, { error: "Comment not found" });
            commentFindByIdSpy.mockResolvedValueOnce({ _id: "c1" });
            const resOk = mockRes();
            await (0, commentController_1.getCommentById)({ params: { id: validId } }, resOk);
            expect(resOk.json).toHaveBeenCalledWith({ _id: "c1" });
            commentFindByIdSpy.mockRejectedValueOnce(new Error("boom"));
            const resErr = mockRes();
            await (0, commentController_1.getCommentById)({ params: { id: validId } }, resErr);
            expectStatusJson(resErr, 500, { error: "boom" });
        });
    });
    describe("getCommentsByPost", () => {
        test("validates query, checks post exists, queries comments, handles error", async () => {
            const resMissing = mockRes();
            await (0, commentController_1.getCommentsByPost)({ query: {} }, resMissing);
            expectStatusJson(resMissing, 422, {
                error: "postId query parameter is required",
            });
            const resInvalid = mockRes();
            await (0, commentController_1.getCommentsByPost)({ query: { postId: "bad" } }, resInvalid);
            expectStatusJson(resInvalid, 422, { error: "Invalid postId format" });
            const postFindByIdSpy = jest.spyOn(postModel_1.default, "findById");
            const commentFindSpy = jest.spyOn(commentModel_1.default, "find");
            postFindByIdSpy.mockResolvedValueOnce(null);
            const resNotFound = mockRes();
            await (0, commentController_1.getCommentsByPost)({ query: { postId: validId } }, resNotFound);
            expectStatusJson(resNotFound, 404, { error: "Post not found" });
            postFindByIdSpy.mockResolvedValueOnce({ _id: "p1" });
            commentFindSpy.mockResolvedValueOnce([{ _id: "c1" }]);
            const resByPostId = mockRes();
            await (0, commentController_1.getCommentsByPost)({ query: { postId: validId } }, resByPostId);
            expect(commentFindSpy).toHaveBeenLastCalledWith({ post: validId });
            expect(resByPostId.json).toHaveBeenCalledWith([{ _id: "c1" }]);
            postFindByIdSpy.mockResolvedValueOnce({ _id: "p1" });
            commentFindSpy.mockResolvedValueOnce([{ _id: "c1" }]);
            const resByPost = mockRes();
            await (0, commentController_1.getCommentsByPost)({ query: { post: validId } }, resByPost);
            expect(commentFindSpy).toHaveBeenLastCalledWith({ post: validId });
            expect(resByPost.json).toHaveBeenCalledWith([{ _id: "c1" }]);
            postFindByIdSpy.mockRejectedValueOnce(new Error("boom"));
            const resErr = mockRes();
            await (0, commentController_1.getCommentsByPost)({ query: { postId: validId } }, resErr);
            expectStatusJson(resErr, 500, { error: "boom" });
        });
    });
    describe("updateComment", () => {
        test("validates inputs/id and handles auth/not-found", async () => {
            const resMissing = mockRes();
            await (0, commentController_1.updateComment)({ params: {}, body: {} }, resMissing);
            expectStatusJson(resMissing, 422, {
                error: "Comment ID and content are required",
            });
            const resMissingContent = mockRes();
            await (0, commentController_1.updateComment)({ params: { id: validId }, body: {} }, resMissingContent);
            expectStatusJson(resMissingContent, 422, {
                error: "Comment ID and content are required",
            });
            const resInvalidId = mockRes();
            await (0, commentController_1.updateComment)({ params: { id: "bad" }, body: { content: "x" } }, resInvalidId);
            expectStatusJson(resInvalidId, 422, {
                error: "Invalid Comment ID format",
            });
            const commentFindByIdSpy = jest.spyOn(commentModel_1.default, "findById");
            commentFindByIdSpy.mockResolvedValueOnce(null);
            const resNotFound = mockRes();
            await (0, commentController_1.updateComment)({
                params: { id: validId },
                body: { content: "x" },
                user: { _id: "u1" },
            }, resNotFound);
            expectStatusJson(resNotFound, 404, { error: "Comment not found" });
        });
        test("enforces ownership and handles success/error", async () => {
            const commentFindByIdSpy = jest.spyOn(commentModel_1.default, "findById");
            commentFindByIdSpy.mockResolvedValueOnce({
                user: { toString: () => "u1" },
            });
            const resNotOwner = mockRes();
            await (0, commentController_1.updateComment)({
                params: { id: validId },
                body: { content: "x" },
                user: { _id: "u2" },
            }, resNotOwner);
            expectStatusJson(resNotOwner, 403, { error: "Unauthorized" });
            const commentDoc = {
                user: { toString: () => "u1" },
                content: "old",
                save: jest.fn().mockResolvedValue(undefined),
            };
            commentFindByIdSpy.mockResolvedValueOnce(commentDoc);
            const resOk = mockRes();
            await (0, commentController_1.updateComment)({
                params: { id: validId },
                body: { content: "new" },
                user: { _id: "u1" },
            }, resOk);
            expect(commentDoc.save).toHaveBeenCalled();
            expect(resOk.json).toHaveBeenCalledWith(commentDoc);
            commentFindByIdSpy.mockRejectedValueOnce(new Error("boom"));
            const resErr = mockRes();
            await (0, commentController_1.updateComment)({
                params: { id: validId },
                body: { content: "x" },
                user: { _id: "u1" },
            }, resErr);
            expectStatusJson(resErr, 500, { error: "boom" });
        });
    });
    describe("deleteComment", () => {
        test("validates id and auth", async () => {
            const resInvalid = mockRes();
            await (0, commentController_1.deleteComment)({ params: { id: "bad" } }, resInvalid);
            expectStatusJson(resInvalid, 422, { error: "Invalid Comment ID format" });
        });
        test("handles not-found/ownership/success/error", async () => {
            const commentFindByIdSpy = jest.spyOn(commentModel_1.default, "findById");
            commentFindByIdSpy.mockResolvedValueOnce(null);
            const resNotFound = mockRes();
            await (0, commentController_1.deleteComment)({ params: { id: validId }, user: { _id: "u1" } }, resNotFound);
            expectStatusJson(resNotFound, 404, { error: "Comment not found" });
            commentFindByIdSpy.mockResolvedValueOnce({
                user: { toString: () => "u1" },
            });
            const resNotOwner = mockRes();
            await (0, commentController_1.deleteComment)({ params: { id: validId }, user: { _id: "u2" } }, resNotOwner);
            expectStatusJson(resNotOwner, 403, { error: "Unauthorized" });
            const delCommentDoc = {
                user: { toString: () => "u1" },
                deleteOne: jest.fn().mockResolvedValue(undefined),
            };
            commentFindByIdSpy.mockResolvedValueOnce(delCommentDoc);
            const resOk = mockRes();
            await (0, commentController_1.deleteComment)({ params: { id: validId }, user: { _id: "u1" } }, resOk);
            expect(delCommentDoc.deleteOne).toHaveBeenCalled();
            expect(resOk.json).toHaveBeenCalledWith({
                message: "Comment deleted successfully",
            });
            commentFindByIdSpy.mockRejectedValueOnce(new Error("boom"));
            const resErr = mockRes();
            await (0, commentController_1.deleteComment)({ params: { id: validId }, user: { _id: "u1" } }, resErr);
            expectStatusJson(resErr, 500, { error: "boom" });
        });
    });
});
