import { Request, Response } from "express";
import Comment from "../models/commentModel";

export const createComment = async (req: Request, res: Response) => {
  const comment = await Comment.create(req.body);
  res.json(comment);
};

export const getAllComments = async (req: Request, res: Response) => {
  const comments = await Comment.find();
  res.json(comments);
};

export const getCommentById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const comment = await Comment.findById(id);
  res.json(comment);
};

export const getCommentsByPost = async (req: Request, res: Response) => {
  const { postId } = req.query;
  const filter = postId ? { postId } : {};
  const comments = await Comment.find(filter);
  res.json(comments);
};

export const updateComment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { sender, content } = req.body;
  const comment = await Comment.findByIdAndUpdate(
    id,
    { sender, content },
    { new: true }
  );
  res.json(comment);
};

export const deleteComment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const comment = await Comment.findByIdAndDelete(id);
  res.json(comment);
};
