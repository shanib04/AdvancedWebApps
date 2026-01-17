import { Request, Response } from "express";
import Comment from "../models/commentModel";
import Post from "../models/postModel";
import { validateObjectId } from "./validateId";

export const createComment = async (req: Request, res: Response) => {
  try {
    const { post: postId, content } = req.body;
    if (!postId || !content) {
      return res
        .status(422)
        .json({ error: "Post ID and content are required" });
    }
    if (!validateObjectId(postId)) {
      return res.status(422).json({ error: "Invalid Post ID format" });
    }
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ error: "Unauthenticated: User not authenticated" });
    }

    const comment = await Comment.create({
      user: req.user.id,
      post: postId,
      content,
    });
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
    if (!validateObjectId(postId as string)) {
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
    const { content } = req.body;
    if (!id || !content) {
      return res
        .status(422)
        .json({ error: "Comment ID and content are required" });
    }
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    comment.content = content;
    await comment.save();
    res.json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(422).json({ error: "Invalid Comment ID format" });
    }
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    await comment.deleteOne();
    res.json({ message: "Comment deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
