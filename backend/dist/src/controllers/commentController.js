"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteComment = exports.updateComment = exports.getCommentsByPost = exports.getCommentById = exports.getAllComments = exports.createComment = void 0;
const commentModel_1 = __importDefault(require("../models/commentModel"));
const postModel_1 = __importDefault(require("../models/postModel"));
const validateId_1 = require("./validateId");
const createComment = async (req, res) => {
    try {
        const postId = req.body?.post ?? req.body?.postId;
        const { content } = req.body;
        if (!postId || !content) {
            return res
                .status(422)
                .json({ error: "Post ID and content are required" });
        }
        if (!(0, validateId_1.validateObjectId)(postId)) {
            return res.status(422).json({ error: "Invalid Post ID format" });
        }
        const post = await postModel_1.default.findById(postId);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }
        const comment = await commentModel_1.default.create({
            user: req.user._id,
            post: postId,
            content,
        });
        res.status(201).json(comment);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.createComment = createComment;
const getAllComments = async (req, res) => {
    try {
        const { user, post } = req.query;
        if (user && !(0, validateId_1.validateObjectId)(user)) {
            return res.status(422).json({ error: "Invalid User ID format" });
        }
        if (post && !(0, validateId_1.validateObjectId)(post)) {
            return res.status(422).json({ error: "Invalid Post ID format" });
        }
        const filter = {};
        if (user)
            filter.user = user;
        if (post)
            filter.post = post;
        const comments = await commentModel_1.default.find(filter);
        res.json(comments);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getAllComments = getAllComments;
const getCommentById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(422).json({ error: "Comment ID is required" });
        }
        if (!(0, validateId_1.validateObjectId)(id)) {
            return res.status(422).json({ error: "Invalid Comment ID format" });
        }
        const comment = await commentModel_1.default.findById(id);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }
        res.json(comment);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getCommentById = getCommentById;
const getCommentsByPost = async (req, res) => {
    try {
        const postId = (req.query.postId ?? req.query.post);
        if (!postId) {
            return res
                .status(422)
                .json({ error: "postId query parameter is required" });
        }
        if (!(0, validateId_1.validateObjectId)(postId)) {
            return res.status(422).json({ error: "Invalid postId format" });
        }
        const post = await postModel_1.default.findById(postId);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }
        const comments = await commentModel_1.default.find({ post: postId });
        res.json(comments);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getCommentsByPost = getCommentsByPost;
const updateComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        if (!id || !content) {
            return res
                .status(422)
                .json({ error: "Comment ID and content are required" });
        }
        if (!(0, validateId_1.validateObjectId)(id)) {
            return res.status(422).json({ error: "Invalid Comment ID format" });
        }
        const comment = await commentModel_1.default.findById(id);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }
        if (comment.user.toString() !== req.user._id) {
            return res.status(403).json({ error: "Unauthorized" });
        }
        comment.content = content;
        await comment.save();
        res.json(comment);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.updateComment = updateComment;
const deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        if (!(0, validateId_1.validateObjectId)(id)) {
            return res.status(422).json({ error: "Invalid Comment ID format" });
        }
        const comment = await commentModel_1.default.findById(id);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }
        if (comment.user.toString() !== req.user._id) {
            return res.status(403).json({ error: "Unauthorized" });
        }
        await comment.deleteOne();
        res.json({ message: "Comment deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.deleteComment = deleteComment;
