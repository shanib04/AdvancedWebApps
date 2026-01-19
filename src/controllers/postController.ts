import { Request, Response } from "express";
import Post from "../models/postModel";
import Comment from "../models/commentModel";
import { validateObjectId } from "./validateId";

export const createPost = async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(422).json({ error: "Content is required" });
    }
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const post = await Post.create({
      user: req.user.id,
      content,
    });
    res.status(201).json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllPosts = async (req: Request, res: Response) => {
  try {
    const { user } = req.query as { user?: string };
    if (user && !validateObjectId(user)) {
      return res.status(422).json({ error: "Invalid User ID format" });
    }
    const posts = await Post.find(user ? { user } : {});
    res.json(posts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPostById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(422).json({ error: "Post ID is required" });
    }
    if (!validateObjectId(id)) {
      return res.status(422).json({ error: "Invalid Post ID format" });
    }
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!id || !content) {
      return res
        .status(422)
        .json({ error: "Post ID and content are required" });
    }
    if (!validateObjectId(id)) {
      return res.status(422).json({ error: "Invalid Post ID format" });
    }
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (!req.user || !post.user || post.user.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    post.content = content;
    await post.save();
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deletePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(422).json({ error: "Invalid Post ID format" });
    }
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (!req.user || !post.user || post.user.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    await Comment.deleteMany({ post: id }); // Cascade delete comments
    await post.deleteOne();
    res.json({ message: "Post and related comments deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
