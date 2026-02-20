"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Ensure route file is executed for coverage.
require("../routes/postRoutes");
const postModel_1 = __importDefault(require("../models/postModel"));
const commentModel_1 = __importDefault(require("../models/commentModel"));
const postController_1 = require("../controllers/postController");
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
describe("postController coverage", () => {
    const validId = "507f1f77bcf86cd799439011";
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe("createPost", () => {
        test("validates input/auth and handles success/error", async () => {
            const resMissing = mockRes();
            await (0, postController_1.createPost)({ body: {} }, resMissing);
            expectStatusJson(resMissing, 422, { error: "Content is required" });
            const postCreateSpy = jest.spyOn(postModel_1.default, "create");
            postCreateSpy.mockResolvedValueOnce({ _id: "p1" });
            const resOk = mockRes();
            await (0, postController_1.createPost)({ body: { content: "x" }, user: { _id: "u1" } }, resOk);
            expect(resOk.status).toHaveBeenCalledWith(201);
            expect(resOk.json).toHaveBeenCalledWith({ _id: "p1" });
            postCreateSpy.mockRejectedValueOnce(new Error("boom"));
            const resErr = mockRes();
            await (0, postController_1.createPost)({ body: { content: "x" }, user: { _id: "u1" } }, resErr);
            expectStatusJson(resErr, 500, { error: "boom" });
        });
    });
    describe("getAllPosts", () => {
        test("validates filter, queries correctly, and handles error", async () => {
            const resInvalid = mockRes();
            await (0, postController_1.getAllPosts)({ query: { user: "bad" } }, resInvalid);
            expectStatusJson(resInvalid, 422, { error: "Invalid User ID format" });
            const postFindSpy = jest.spyOn(postModel_1.default, "find");
            postFindSpy.mockResolvedValueOnce([]);
            const resNoFilter = mockRes();
            await (0, postController_1.getAllPosts)({ query: {} }, resNoFilter);
            expect(postFindSpy).toHaveBeenLastCalledWith({});
            expect(resNoFilter.json).toHaveBeenCalledWith([]);
            postFindSpy.mockResolvedValueOnce([]);
            const resWithFilter = mockRes();
            await (0, postController_1.getAllPosts)({ query: { user: validId } }, resWithFilter);
            expect(postFindSpy).toHaveBeenLastCalledWith({ user: validId });
            expect(resWithFilter.json).toHaveBeenCalledWith([]);
            postFindSpy.mockRejectedValueOnce(new Error("boom"));
            const resErr = mockRes();
            await (0, postController_1.getAllPosts)({ query: {} }, resErr);
            expectStatusJson(resErr, 500, { error: "boom" });
        });
    });
    describe("getPostById", () => {
        test("validates id and handles not-found/success/error", async () => {
            const resMissing = mockRes();
            await (0, postController_1.getPostById)({ params: {} }, resMissing);
            expectStatusJson(resMissing, 422, { error: "Post ID is required" });
            const resInvalid = mockRes();
            await (0, postController_1.getPostById)({ params: { id: "bad" } }, resInvalid);
            expectStatusJson(resInvalid, 422, { error: "Invalid Post ID format" });
            const postFindByIdSpy = jest.spyOn(postModel_1.default, "findById");
            postFindByIdSpy.mockResolvedValueOnce(null);
            const resNotFound = mockRes();
            await (0, postController_1.getPostById)({ params: { id: validId } }, resNotFound);
            expectStatusJson(resNotFound, 404, { error: "Post not found" });
            postFindByIdSpy.mockResolvedValueOnce({ _id: "p1" });
            const resOk = mockRes();
            await (0, postController_1.getPostById)({ params: { id: validId } }, resOk);
            expect(resOk.json).toHaveBeenCalledWith({ _id: "p1" });
            postFindByIdSpy.mockRejectedValueOnce(new Error("boom"));
            const resErr = mockRes();
            await (0, postController_1.getPostById)({ params: { id: validId } }, resErr);
            expectStatusJson(resErr, 500, { error: "boom" });
        });
    });
    describe("updatePost", () => {
        test("validates inputs/id and handles not-found", async () => {
            const resMissing = mockRes();
            await (0, postController_1.updatePost)({ params: {}, body: {} }, resMissing);
            expectStatusJson(resMissing, 422, {
                error: "Post ID and content are required",
            });
            const resMissingContent = mockRes();
            await (0, postController_1.updatePost)({ params: { id: validId }, body: {} }, resMissingContent);
            expectStatusJson(resMissingContent, 422, {
                error: "Post ID and content are required",
            });
            const resInvalidId = mockRes();
            await (0, postController_1.updatePost)({ params: { id: "bad" }, body: { content: "x" } }, resInvalidId);
            expectStatusJson(resInvalidId, 422, { error: "Invalid Post ID format" });
            const postFindByIdSpy = jest.spyOn(postModel_1.default, "findById");
            postFindByIdSpy.mockResolvedValueOnce(null);
            const resNotFound = mockRes();
            await (0, postController_1.updatePost)({ params: { id: validId }, body: { content: "x" } }, resNotFound);
            expectStatusJson(resNotFound, 404, { error: "Post not found" });
        });
        test("enforces ownership and handles success/error", async () => {
            const postFindByIdSpy = jest.spyOn(postModel_1.default, "findById");
            postFindByIdSpy.mockResolvedValueOnce({});
            const resNoPostUser = mockRes();
            await (0, postController_1.updatePost)({
                params: { id: validId },
                body: { content: "x" },
                user: { _id: "u1" },
            }, resNoPostUser);
            expectStatusJson(resNoPostUser, 403, { error: "Unauthorized" });
            postFindByIdSpy.mockResolvedValueOnce({ user: { toString: () => "u1" } });
            const resNotOwner = mockRes();
            await (0, postController_1.updatePost)({
                params: { id: validId },
                body: { content: "x" },
                user: { _id: "u2" },
            }, resNotOwner);
            expectStatusJson(resNotOwner, 403, { error: "Unauthorized" });
            const postDoc = {
                user: { toString: () => "u1" },
                content: "old",
                save: jest.fn().mockResolvedValue(undefined),
            };
            postFindByIdSpy.mockResolvedValueOnce(postDoc);
            const resOk = mockRes();
            await (0, postController_1.updatePost)({
                params: { id: validId },
                body: { content: "new" },
                user: { _id: "u1" },
            }, resOk);
            expect(postDoc.save).toHaveBeenCalled();
            expect(resOk.json).toHaveBeenCalledWith(postDoc);
            postFindByIdSpy.mockRejectedValueOnce(new Error("boom"));
            const resErr = mockRes();
            await (0, postController_1.updatePost)({
                params: { id: validId },
                body: { content: "x" },
                user: { _id: "u1" },
            }, resErr);
            expectStatusJson(resErr, 500, { error: "boom" });
        });
    });
    describe("deletePost", () => {
        test("validates id and handles not-found", async () => {
            const resInvalid = mockRes();
            await (0, postController_1.deletePost)({ params: { id: "bad" } }, resInvalid);
            expectStatusJson(resInvalid, 422, { error: "Invalid Post ID format" });
            const postFindByIdSpy = jest.spyOn(postModel_1.default, "findById");
            postFindByIdSpy.mockResolvedValueOnce(null);
            const resNotFound = mockRes();
            await (0, postController_1.deletePost)({ params: { id: validId } }, resNotFound);
            expectStatusJson(resNotFound, 404, { error: "Post not found" });
        });
        test("enforces ownership, cascades delete, and handles error", async () => {
            const postFindByIdSpy = jest.spyOn(postModel_1.default, "findById");
            postFindByIdSpy.mockResolvedValueOnce({});
            const resNoPostUser = mockRes();
            await (0, postController_1.deletePost)({ params: { id: validId }, user: { _id: "u1" } }, resNoPostUser);
            expectStatusJson(resNoPostUser, 403, { error: "Unauthorized" });
            postFindByIdSpy.mockResolvedValueOnce({ user: { toString: () => "u1" } });
            const resNotOwner = mockRes();
            await (0, postController_1.deletePost)({ params: { id: validId }, user: { _id: "u2" } }, resNotOwner);
            expectStatusJson(resNotOwner, 403, { error: "Unauthorized" });
            const delPostDoc = {
                user: { toString: () => "u1" },
                deleteOne: jest.fn().mockResolvedValue(undefined),
            };
            const commentDeleteManySpy = jest.spyOn(commentModel_1.default, "deleteMany");
            postFindByIdSpy.mockResolvedValueOnce(delPostDoc);
            commentDeleteManySpy.mockResolvedValueOnce({ deletedCount: 0 });
            const resOk = mockRes();
            await (0, postController_1.deletePost)({ params: { id: validId }, user: { _id: "u1" } }, resOk);
            expect(commentDeleteManySpy).toHaveBeenCalledWith({ post: validId });
            expect(delPostDoc.deleteOne).toHaveBeenCalled();
            expect(resOk.json).toHaveBeenCalledWith({
                message: "Post and related comments deleted successfully",
            });
            postFindByIdSpy.mockRejectedValueOnce(new Error("boom"));
            const resErr = mockRes();
            await (0, postController_1.deletePost)({ params: { id: validId }, user: { _id: "u1" } }, resErr);
            expectStatusJson(resErr, 500, { error: "boom" });
        });
    });
});
