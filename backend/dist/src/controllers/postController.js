"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePost = exports.updatePost = exports.getPostById = exports.getAllPosts = exports.createPost = void 0;
const postModel_1 = __importDefault(require("../models/postModel"));
const commentModel_1 = __importDefault(require("../models/commentModel"));
const validateId_1 = require("./validateId");
const createPost = async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(422).json({ error: "Content is required" });
        }
        const post = await postModel_1.default.create({
            user: req.user._id,
            content,
        });
        res.status(201).json(post);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.createPost = createPost;
const getAllPosts = async (req, res) => {
    try {
        const { user } = req.query;
        if (user && !(0, validateId_1.validateObjectId)(user)) {
            return res.status(422).json({ error: "Invalid User ID format" });
        }
        const posts = await postModel_1.default.find(user ? { user } : {});
        res.json(posts);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getAllPosts = getAllPosts;
const getPostById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(422).json({ error: "Post ID is required" });
        }
        if (!(0, validateId_1.validateObjectId)(id)) {
            return res.status(422).json({ error: "Invalid Post ID format" });
        }
        const post = await postModel_1.default.findById(id);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }
        res.json(post);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getPostById = getPostById;
const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        if (!id || !content) {
            return res
                .status(422)
                .json({ error: "Post ID and content are required" });
        }
        if (!(0, validateId_1.validateObjectId)(id)) {
            return res.status(422).json({ error: "Invalid Post ID format" });
        }
        const post = await postModel_1.default.findById(id);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }
        if (!post.user || post.user.toString() !== req.user._id) {
            return res.status(403).json({ error: "Unauthorized" });
        }
        post.content = content;
        await post.save();
        res.json(post);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.updatePost = updatePost;
const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        if (!(0, validateId_1.validateObjectId)(id)) {
            return res.status(422).json({ error: "Invalid Post ID format" });
        }
        const post = await postModel_1.default.findById(id);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }
        if (!post.user || post.user.toString() !== req.user._id) {
            return res.status(403).json({ error: "Unauthorized" });
        }
        await commentModel_1.default.deleteMany({ post: id }); // Cascade delete comments
        await post.deleteOne();
        res.json({ message: "Post and related comments deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.deletePost = deletePost;
