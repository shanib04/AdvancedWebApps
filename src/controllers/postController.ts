import { Request, Response } from "express";
import Post from "../models/postModel";
import mongoose from "mongoose";

export const createPost = async (req: Request, res: Response) => {
  try {
    const { sender, content } = req.body;
    if (!sender || !content) {
      return res.status(400).json({ error: "sender and content are required" });
    }
    const post = await Post.create(req.body);
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
      return res.status(400).json({ error: "Post ID is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid Post ID format" });
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
    if (!id) {
      return res.status(400).json({ error: "Post ID is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid Post ID format" });
    }
    if (!sender || !content) {
      return res.status(400).json({ error: "sender and content are required" });
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
