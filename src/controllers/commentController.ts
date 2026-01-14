import { Request, Response } from "express";
import Comment from "../models/commentModel";
import Post from "../models/postModel";
import mongoose from "mongoose";

export const createComment = async (req: Request, res: Response) => {
  try {
    const { postId, sender, content } = req.body;
    if (!postId || !sender || !content) {
      return res
        .status(422)
        .json({ error: "postId, sender, and content are required" });
    }
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(422).json({ error: "Invalid postId format" });
    }
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    const comment = await Comment.create(req.body);
    res.status(201).json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllComments = async (req: Request, res: Response) => {
  try {
    const { sender } = req.query;
    const comments = await Comment.find(sender ? { sender } : {});
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCommentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(422).json({ error: "Comment ID is required" });
    }
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    res.json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCommentsByPost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.query;
    if (!postId) {
      return res
        .status(422)
        .json({ error: "postId query parameter is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(postId as string)) {
      return res.status(422).json({ error: "Invalid postId format" });
    }
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    const comments = await Comment.find({ postId });
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sender, content } = req.body;
    if (!id || !sender || !content) {
      return res
        .status(422)
        .json({ error: "Comment ID, sender and content are required" });
    }
    const comment = await Comment.findByIdAndUpdate(
      id,
      { sender, content },
      { new: true }
    );
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    res.json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(422).json({ error: "Comment ID is required" });
    }
    const comment = await Comment.findByIdAndDelete(id);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    res.json({ message: "Comment deleted successfully", comment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
