import { Response } from "express";
import Comment from "../models/commentModel";
import Post from "../models/postModel";
import { validateObjectId } from "./validateId";
import { AuthRequest } from "../middleware/authMiddleware";
import { getErrorMessage } from "../utils/getErrorMessage";

export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.body?.post ?? req.body?.postId;
    const { content } = req.body;
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

    const comment = await Comment.create({
      user: req.user._id,
      post: postId,
      content,
    });
    res.status(201).json(comment);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const getAllComments = async (req: AuthRequest, res: Response) => {
  try {
    const { user, post } = req.query as { user?: string; post?: string };
    if (user && !validateObjectId(user)) {
      return res.status(422).json({ error: "Invalid User ID format" });
    }
    if (post && !validateObjectId(post)) {
      return res.status(422).json({ error: "Invalid Post ID format" });
    }

    const filter: Record<string, string> = {};
    if (user) filter.user = user;
    if (post) filter.post = post;

    const comments = await Comment.find(filter);
    res.json(comments);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const getCommentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(422).json({ error: "Comment ID is required" });
    }
    if (!validateObjectId(id)) {
      return res.status(422).json({ error: "Invalid Comment ID format" });
    }
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    res.json(comment);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const getCommentsByPost = async (req: AuthRequest, res: Response) => {
  try {
    const postId = (req.query.postId ?? req.query.post) as string | undefined;
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
    const comments = await Comment.find({ post: postId });
    res.json(comments);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const updateComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!id || !content) {
      return res
        .status(422)
        .json({ error: "Comment ID and content are required" });
    }
    if (!validateObjectId(id)) {
      return res.status(422).json({ error: "Invalid Comment ID format" });
    }
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.user.toString() !== req.user._id) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    comment.content = content;
    await comment.save();
    res.json(comment);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(422).json({ error: "Invalid Comment ID format" });
    }
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.user.toString() !== req.user._id) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    await comment.deleteOne();
    res.json({ message: "Comment deleted successfully" });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};
