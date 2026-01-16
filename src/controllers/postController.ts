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
    const { sender } = req.query;
    const posts = await Post.find(sender ? { sender } : {});
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
    const { sender, content } = req.body;
    if (!id || !sender || !content) {
      return res
        .status(422)
        .json({ error: "Post ID, sender and content are required" });
    }
    if (!validateObjectId(id)) {
      return res.status(422).json({ error: "Invalid Post ID format" });
    }
    const post = await Post.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deletePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log("Delete Post - ID:", id);
    if (!validateObjectId(id)) {
      return res.status(422).json({ error: "Invalid Post ID format" });
    }
    const post = await Post.findById(id);
    console.log("Delete Post - Found Post:", post);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (!req.user || !post.user || post.user.toString() !== req.user.id) {
      console.log("Delete Post - Unauthorized:", {
        postUser: post.user,
        requestUser: req.user ? req.user.id : null,
      });
      return res.status(403).json({ error: "Unauthorized" });
    }
    await Comment.deleteMany({ post: id }); // Cascade delete comments
    await post.deleteOne();
    res.json({ message: "Post and related comments deleted successfully" });
  } catch (error: any) {
    console.error("Delete Post - Error:", error);
    res.status(500).json({ error: error.message });
  }
};
