import { Request, Response } from "express";
import Post from "../models/postModel";

export const createPost = async (req: Request, res: Response) => {
  const post = await Post.create(req.body);
  res.json(post);
};

export const getAllPosts = async (req: Request, res: Response) => {
  const { sender } = req.query;
  const posts = await Post.find(sender ? { sender } : {});
  res.json(posts);
};

export const getPostById = async (req: Request, res: Response) => {
  const post = await Post.findById(req.params.id);
  res.json(post);
};

export const updatePost = async (req: Request, res: Response) => {
  const post = await Post.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(post);
};
